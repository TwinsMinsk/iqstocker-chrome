"""
FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

from app.core.config import settings
from app.api.v1 import router as v1_router
from app.integrations.redis_client import init_redis, close_redis
from app.db.init_db import init_db

# Initialize Sentry
# В тестовом окружении Sentry не нужен и может ломать импорт при некорректном DSN.
if settings.ENVIRONMENT != "test" and settings.SENTRY_DSN:
    try:
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            integrations=[FastApiIntegration()],
            traces_sample_rate=0.1,
            environment=settings.ENVIRONMENT,
        )
    except Exception as e:
        # Fail-open: не блокируем запуск API из-за мониторинга.
        print(f"⚠️ Sentry init failed: {e}")

app = FastAPI(
    title="IQStocker Chrome Auto API",
    description="API для сервиса автоматизации Midjourney",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Добавляем ProxyHeadersMiddleware для корректной работы за прокси (Railway)
# Это позволяет FastAPI правильно определять https и IP адрес клиента
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# TrustedHostMiddleware - на Railway может вызывать проблемы с 400 Bad Request
# если HOST заголовок не совпадает. Разрешаем все хосты, если в настройках "*"
allowed_hosts = settings.ALLOWED_HOSTS

if settings.ENVIRONMENT != "test":
    # В production (Railway) TrustedHostMiddleware часто ломает preflight (OPTIONS) из-за Host заголовков прокси.
    # Поэтому в production мы его отключаем полностью.
    if settings.ENVIRONMENT != "production" and "*" not in allowed_hosts:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=allowed_hosts
        )
else:
    # В тестовом окружении добавляем "testserver" в allowed_hosts
    test_allowed_hosts = list(allowed_hosts) + ["testserver"]
    if "*" not in test_allowed_hosts:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=test_allowed_hosts
        )

# CORS middleware добавляем ПОСЛЕДНИМ, чтобы он был внешним (outermost) и добавлял заголовки даже на ошибочные ответы.
# Это критично для preflight запросов (OPTIONS), иначе браузер блокирует запросы как CORS.
#
# В production на Railway разрешаем все origins, чтобы гарантированно убрать блокировку регистрации.
# (Позже можно сузить до конкретного домена фронтенда через переменную CORS_ORIGINS.)
if settings.ENVIRONMENT == "production":
    origins = ["*"]
else:
    # В development всегда добавляем localhost:3000 для фронтенда
    origins = list(settings.CORS_ORIGINS)
    if "http://localhost:3000" not in origins:
        origins.append("http://localhost:3000")
    # Если в списке только "*", заменяем на конкретные origins для работы с credentials
    if origins == ["*"]:
        origins = ["http://localhost:3000", "http://127.0.0.1:3000"]

# Если в списке есть "*", то allow_credentials должно быть False (требование CORS спецификации)
allow_all_origins = "*" in origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
# ВАЖНО для production:
# На Railway/в CI переменная API_V1_PREFIX иногда задаётся с хвостовым слэшем ("/api/v1/"),
# что приводит к фактическим URL вида "/api/v1//users/me" и даёт 404 при запросе "/api/v1/users/me".
# Поэтому нормализуем префикс здесь (и дополнительно держим алиас на "/api/v1" для совместимости).
api_prefix = (settings.API_V1_PREFIX or "/api/v1").strip()
api_prefix = "/" + api_prefix.lstrip("/")  # гарантируем ведущий "/"
api_prefix = api_prefix.rstrip("/")        # убираем хвостовой "/"
if api_prefix == "/":
    api_prefix = ""

app.include_router(v1_router, prefix=api_prefix)

# Алиас на стандартный префикс, чтобы фронт гарантированно работал даже при ошибочной env-конфигурации.
if api_prefix != "/api/v1":
    app.include_router(v1_router, prefix="/api/v1")


# Startup/Shutdown events
@app.on_event("startup")
async def startup_event():
    """Инициализация при старте приложения"""
    # ВАЖНО:
    # - SQLite (dev/test): создаём таблицы через create_all.
    # - PostgreSQL (production): НЕ используем create_all, только Alembic миграции.
    if settings.USE_SQLITE or settings.ENVIRONMENT == "test":
        try:
            init_db()
            print("✅ Database tables initialized")
        except Exception as e:
            print(f"⚠️ Database initialization error: {e}")
    
    # Инициализация Redis
    try:
        await init_redis()
    except Exception as e:
        print(f"⚠️ Redis initialization failed: {e}")
        print("⚠️ Continuing without Redis...")

    # === LOG API KEYS (PARTIALLY MASKED) ===
    # Выводим первые 4 и последние 4 символа ключа для проверки
    tribute_key = settings.TRIBUTE_API_KEY
    if tribute_key:
        masked_key = f"{tribute_key[:4]}...{tribute_key[-4:]}" if len(tribute_key) > 8 else "***"
        print(f"🔑 TRIBUTE_API_KEY loaded: {masked_key}")
    else:
        print("❌ TRIBUTE_API_KEY is missing or empty")
    # =======================================


@app.on_event("shutdown")
async def shutdown_event():
    """Очистка при завершении приложения"""
    try:
        await close_redis()
    except Exception as e:
        print(f"⚠️ Redis shutdown error: {e}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "IQStocker Chrome Auto API",
        "version": "1.0.0",
        "docs": "/api/docs",
        "health": "/health"
    }

@app.get("/health")
async def health_check():
    """
    Health check endpoint для мониторинга
    Проверяет доступность критичных сервисов
    """
    from app.db.session import get_db
    from app.integrations.redis_client import get_redis_client as get_redis
    
    health_status = {
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "services": {}
    }
    
    # Проверка database
    try:
        from sqlalchemy import text
        db = next(get_db())
        db.execute(text("SELECT 1"))
        health_status["services"]["database"] = "ok"
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["services"]["database"] = f"error: {str(e)}"
    
    # Проверка Redis (опционально)
    try:
        redis = await get_redis()
        if redis:
            await redis.ping()
            health_status["services"]["redis"] = "ok"
        else:
            health_status["services"]["redis"] = "not configured"
    except Exception as e:
        health_status["services"]["redis"] = f"error: {str(e)}"
    
    return health_status

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )

