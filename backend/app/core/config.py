"""
Конфигурация приложения
Использует Pydantic Settings для загрузки переменных окружения
"""
from pydantic_settings import BaseSettings
from typing import List
from functools import lru_cache


class Settings(BaseSettings):
    """Настройки приложения из переменных окружения"""
    
    # Database
    # Для разработки без Docker можно использовать SQLite:
    # DATABASE_URL: str = "sqlite:///./iqstocker.db"
    # Для production используйте PostgreSQL:
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/iqstocker_auto"
    REDIS_URL: str | None = None  # Опционально, можно обойтись без Redis на начальном этапе
    
    # Использовать SQLite для разработки (если нет Docker/PostgreSQL)
    USE_SQLITE: bool = True
    
    # JWT
    SECRET_KEY: str = "your-secret-key-generate-me-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_DAYS: int = 30
    
    # OAuth Google
    GOOGLE_CLIENT_ID: str | None = None
    GOOGLE_CLIENT_SECRET: str | None = None
    
    # Telegram Tribute
    TRIBUTE_API_KEY: str | None = None
    TRIBUTE_WEBHOOK_SECRET: str | None = None
    
    # SendGrid
    SENDGRID_API_KEY: str | None = None
    SENDGRID_FROM_EMAIL: str = "noreply@iqstocker.com"
    
    # Sentry
    SENTRY_DSN: str | None = None
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    ALLOWED_HOSTS: List[str] = ["localhost", "127.0.0.1"]
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    
    # Security & Protection Settings
    # Batch validation settings
    BATCH_VALIDATION_ENABLED: bool = True
    SESSION_TOKEN_TTL_HOURS: int = 1
    SESSION_TOKEN_SECRET: str = "session-token-secret-change-me"
    
    # Rate limiting
    RATE_LIMIT_BATCH_REQUESTS: int = 1  # requests per window
    RATE_LIMIT_BATCH_WINDOW: int = 60  # seconds
    RATE_LIMIT_API_REQUESTS: int = 100
    RATE_LIMIT_API_WINDOW: int = 60
    
    # Fingerprinting (optional)
    FINGERPRINTING_ENABLED: bool = False
    MAX_DEVICES_PER_LICENSE: int = 3
    
    # Graceful degradation
    CACHE_PERMISSION_TTL: int = 300  # 5 minutes
    
    # Extension config defaults
    DEFAULT_MIN_INTERVAL_MS: int = 60000  # 60 seconds
    DEFAULT_MAX_INTERVAL_MS: int = 300000  # 5 minutes
    DEFAULT_MAX_RETRIES: int = 3
    
    # Version check (optional)
    MIN_VERSION_REQUIRED: str | None = None  # Минимальная версия расширения (например "1.0.1")
    
    # Remote selector (optional)
    DISCORD_INPUT_SELECTOR: str | None = None  # Селектор поля ввода Discord с сервера
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Получить настройки (кэшируется)"""
    return Settings()


# Глобальный экземпляр настроек
settings = get_settings()

