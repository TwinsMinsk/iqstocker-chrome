"""
Конфигурация приложения
Использует Pydantic Settings для загрузки переменных окружения
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator, Field
from typing import List
from functools import lru_cache
import os
import json


class Settings(BaseSettings):
    """Настройки приложения из переменных окружения"""
    
    # Database
    # Для разработки без Docker можно использовать SQLite:
    # DATABASE_URL: str = "sqlite:///./iqstocker.db"
    # Для production используйте PostgreSQL:
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/iqstocker_auto"
    
    @field_validator('DATABASE_URL', mode='before')
    @classmethod
    def normalize_database_url(cls, v):
        """
        Нормализует DATABASE_URL, обрабатывая проблемы с кодировкой.
        Исправляет UnicodeDecodeError при работе с переменными окружения Railway.
        """
        if v is None:
            return v
        
        # Если это байты, декодируем в UTF-8 с обработкой ошибок
        if isinstance(v, bytes):
            try:
                return v.decode('utf-8')
            except UnicodeDecodeError:
                # Пытаемся другие кодировки, если UTF-8 не работает
                try:
                    return v.decode('latin-1')
                except:
                    return v.decode('utf-8', errors='replace')
        
        # Убеждаемся, что это строка
        return str(v)
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
    # Храним как строку, чтобы избежать автоматического JSON парсинга Pydantic
    # Используем property для получения списка
    cors_origins_str: str = Field(
        default='["*"]',
        alias="CORS_ORIGINS",
        description="CORS allowed origins (JSON array, comma-separated string, or single URL)"
    )
    allowed_hosts_str: str = Field(
        default='["*"]',
        alias="ALLOWED_HOSTS",
        description="Allowed hosts (JSON array, comma-separated string, or single host)"
    )
    
    @field_validator('cors_origins_str', mode='before')
    @classmethod
    def parse_cors_origins_str(cls, v):
        """Парсит CORS_ORIGINS как строку"""
        if v is None:
            return '["*"]'
        
        # Если это уже список (из дефолтного значения), конвертируем в JSON строку
        if isinstance(v, list):
            return json.dumps(v)
        
        # Если это строка, возвращаем как есть
        return str(v) if v else '["*"]'
    
    @field_validator('allowed_hosts_str', mode='before')
    @classmethod
    def parse_allowed_hosts_str(cls, v):
        """Парсит ALLOWED_HOSTS как строку"""
        if v is None:
            return '["*"]'
        
        # Если это уже список (из дефолтного значения), конвертируем в JSON строку
        if isinstance(v, list):
            return json.dumps(v)
        
        # Если это строка, возвращаем как есть
        return str(v) if v else '["*"]'
    
    @property
    def CORS_ORIGINS(self) -> List[str]:
        """Возвращает CORS_ORIGINS как список"""
        value = self.cors_origins_str.strip()
        if not value:
            return ["*"]
        
        # Пробуем распарсить как JSON
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return [str(item) for item in parsed if item]
            return [str(parsed)] if parsed else ["*"]
        except (json.JSONDecodeError, ValueError, TypeError):
            # Если не JSON, пробуем разделить по запятой
            if ',' in value:
                origins = [origin.strip() for origin in value.split(',') if origin.strip()]
                return origins if origins else ["*"]
            # Если один элемент, возвращаем как список
            return [value] if value else ["*"]
    
    @property
    def ALLOWED_HOSTS(self) -> List[str]:
        """Возвращает ALLOWED_HOSTS как список"""
        value = self.allowed_hosts_str.strip()
        if not value:
            return ["*"]
        
        # Пробуем распарсить как JSON
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return [str(item) for item in parsed if item]
            return [str(parsed)] if parsed else ["*"]
        except (json.JSONDecodeError, ValueError, TypeError):
            # Если не JSON, пробуем разделить по запятой
            if ',' in value:
                hosts = [host.strip() for host in value.split(',') if host.strip()]
                return hosts if hosts else ["*"]
            # Если один элемент, возвращаем как список
            return [value] if value else ["*"]
    
    # API
    # API prefix (важно: без хвостового "/")
    API_V1_PREFIX: str = "/api/v1"

    @field_validator("API_V1_PREFIX", mode="before")
    @classmethod
    def normalize_api_v1_prefix(cls, v):
        """
        Нормализует API_V1_PREFIX:
        - гарантирует ведущий "/"
        - убирает хвостовые слэши

        Это защищает от 404 в production, когда переменная окружения задана как "/api/v1/".
        """
        if v is None:
            return "/api/v1"
        s = str(v).strip()
        if not s:
            return "/api/v1"
        if not s.startswith("/"):
            s = "/" + s
        s = s.rstrip("/")
        return s or "/api/v1"
    
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
    DEFAULT_MIN_INTERVAL_MS: int = 15000  # 15 seconds
    DEFAULT_MAX_INTERVAL_MS: int = 300000  # 5 minutes
    DEFAULT_MAX_RETRIES: int = 3
    
    # Free credits for new users
    FREE_CREDITS_AMOUNT: int = 50  # Количество бесплатных кредитов при регистрации
    
    # Version check (optional)
    MIN_VERSION_REQUIRED: str | None = None  # Минимальная версия расширения (например "1.0.1")
    
    # Remote selector (optional)
    DISCORD_INPUT_SELECTOR: str | None = None  # Селектор поля ввода Discord с сервера
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        # Отключаем автоматический JSON парсинг для List полей
        # чтобы валидаторы могли обработать строки
        json_encoders = {
            List[str]: lambda v: v if isinstance(v, list) else json.loads(v) if isinstance(v, str) else v
        }


@lru_cache()
def get_settings() -> Settings:
    """Получить настройки (кэшируется)"""
    return Settings()


# Глобальный экземпляр настроек
settings = get_settings()

