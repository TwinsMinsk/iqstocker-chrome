"""
Redis Client для session storage и rate limiting
"""
from typing import Optional
import redis.asyncio as aioredis
from app.core.config import settings


# Global Redis client
_redis_client: Optional[aioredis.Redis] = None


async def init_redis():
    """Инициализация Redis client при старте приложения"""
    global _redis_client
    
    if settings.REDIS_URL:
        try:
            _redis_client = await aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=2,  # Таймаут подключения
                socket_timeout=2  # Таймаут операций
            )
            # Проверить подключение
            await _redis_client.ping()
            print(f"✅ Redis connected: {settings.REDIS_URL}")
        except Exception as e:
            print(f"⚠️  Redis connection failed: {e}")
            _redis_client = None
    else:
        print("⚠️  Redis URL not configured, running without cache")


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

