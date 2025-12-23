"""
FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

from app.core.config import settings
from app.api.v1 import router as v1_router
from app.integrations.redis_client import init_redis, close_redis
from app.db.init_db import init_db

# Initialize Sentry
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.1,
        environment=settings.ENVIRONMENT,
    )

app = FastAPI(
    title="IQStocker Chrome Auto API",
    description="API для сервиса автоматизации Midjourney",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS
)

# Routes
app.include_router(v1_router, prefix=settings.API_V1_PREFIX)


# Startup/Shutdown events
@app.on_event("startup")
async def startup_event():
    """Инициализация при старте приложения"""
    # Создаем таблицы в базе данных (если их еще нет)
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
    """Health check endpoint"""
    return {
        "status": "ok",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "database": "connected" if settings.DATABASE_URL else "not configured"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )

