"""
Redis Client для session storage и rate limiting
"""
from typing import Optional
import redis.asyncio as aioredis
from app.core.config import settings


# Global Redis client
_redis_client: Optional[aioredis.Redis] = None


async def init_redis():
    """
    Инициализация Redis client при старте приложения
    
    Оптимизировано для production:
    - Connection pooling (до 50 соединений)
    - Retry on timeout
    - Health check каждые 30 секунд
    - Увеличенные таймауты для стабильности
    """
    global _redis_client
    
    if settings.REDIS_URL:
        try:
            _redis_client = await aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,    # Увеличено до 5 секунд для production
                socket_timeout=5,            # Увеличено до 5 секунд для операций
                retry_on_timeout=True,       # Автоматические повторные попытки
                health_check_interval=30,    # Health check каждые 30 секунд
                max_connections=50           # Connection pool до 50 соединений
            )
            # Проверить подключение
            await _redis_client.ping()
            
            # Маскируем пароль в логах для безопасности
            safe_url = settings.REDIS_URL.split('@')[-1] if '@' in settings.REDIS_URL else settings.REDIS_URL
            print(f"✅ Redis connected: redis://***@{safe_url}")
        except Exception as e:
            print(f"⚠️  Redis connection failed: {e}")
            print(f"⚠️  Continuing without Redis - некоторые функции будут недоступны:")
            print(f"    - Rate limiting будет отключен")
            print(f"    - Session storage будет ограничен")
            print(f"    - Кэширование будет недоступно")
            _redis_client = None
    else:
        print("⚠️  REDIS_URL not configured")
        print("⚠️  Running without Redis - для production рекомендуется настроить Redis")
        print("⚠️  См. RAILWAY_REDIS_SETUP.md для инструкций")


async def close_redis():
    """Закрыть Redis connection при shutdown"""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        print("✅ Redis connection closed")


def get_redis_client() -> Optional[aioredis.Redis]:
    """
    Dependency для получения Redis client.
    Используется в FastAPI endpoints.
    """
    return _redis_client

