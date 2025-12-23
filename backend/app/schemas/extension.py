"""
Extension schemas для валидации и защиты
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any
from datetime import datetime


# ==================== REQUEST SCHEMAS ====================

class ValidateKeyRequest(BaseModel):
    """Валидация лицензионного ключа (legacy endpoint)"""
    key: str = Field(..., min_length=20, max_length=100, description="License key")


class BatchValidateRequest(BaseModel):
    """
    Batch validation - запрос разрешения на всю сессию.
    Основной endpoint для защиты.
    """
    license_key: str = Field(..., min_length=20, max_length=100)
    prompts_count: int = Field(..., ge=1, le=1000, description="Количество промптов в сессии")
    
    @validator('prompts_count')
    def validate_prompts_count(cls, v):
        if v > 1000:
            raise ValueError('Maximum 1000 prompts per session')
        return v


class FinalizeSessionRequest(BaseModel):
    """
    Финализация сессии - подтверждение использования кредитов
    """
    session_token: str = Field(..., min_length=32, max_length=256)
    prompts_sent: int = Field(..., ge=0)
    errors_count: int = Field(default=0, ge=0)
    duration_seconds: Optional[int] = Field(None, ge=0)


class BindLicenseRequest(BaseModel):
    """
    Привязка лицензии к устройству (fingerprinting)
    """
    license_key: str = Field(..., min_length=20, max_length=100)
    fingerprint: str = Field(..., min_length=32, max_length=64)
    device_info: Optional[Dict[str, str]] = None


class LogUsageRequest(BaseModel):
    """
    Логирование использования расширения (метаданные, БЕЗ текстов промптов!)
    """
    session_id: str = Field(..., max_length=100)
    prompts_count: int = Field(..., ge=0)
    errors_count: int = Field(default=0, ge=0)
    duration_seconds: int = Field(..., ge=0)
    events: Optional[list] = None  # Детальные события


# ==================== RESPONSE SCHEMAS ====================

class ValidateKeyResponse(BaseModel):
    """Response для legacy валидации ключа"""
    valid: bool
    user_id: Optional[str] = None
    subscription_active: Optional[bool] = None
    tier: Optional[str] = None
    expires_at: Optional[datetime] = None
    balance: Optional[int] = None
    monthly_limit: Optional[int] = None
    used_this_month: Optional[int] = None
    error: Optional[str] = None
    message: Optional[str] = None


class ExtensionConfig(BaseModel):
    """Конфигурация для расширения (интервалы, лимиты)"""
    min_interval_ms: int = Field(default=60000, description="Минимальный интервал между промптами")
    max_interval_ms: int = Field(default=300000, description="Максимальный интервал")
    max_retries: int = Field(default=3, description="Максимум попыток при ошибке")


class BatchValidateResponse(BaseModel):
    """
    Response для batch validation.
    Содержит session token и конфигурацию.
    """
    allowed: bool
    session_token: Optional[str] = None
    expires_at: Optional[datetime] = None
    config: Optional[ExtensionConfig] = None
    error: Optional[str] = None
    message: Optional[str] = None
    
    # Дополнительная информация
    credits_reserved: Optional[int] = None
    credits_remaining: Optional[int] = None


class FinalizeSessionResponse(BaseModel):
    """Response для финализации сессии"""
    success: bool
    message: str
    credits_used: int
    credits_remaining: int
    session_duration_seconds: Optional[int] = None


class BindLicenseResponse(BaseModel):
    """Response для привязки лицензии"""
    status: str  # "bound", "already_bound", "approval_required"
    message: Optional[str] = None
    devices_count: Optional[int] = None


class BalanceResponse(BaseModel):
    """Текущий баланс пользователя"""
    balance: int
    subscription_expires: Optional[datetime] = None
    monthly_limit: Optional[int] = None
    used_this_month: int
    last_sync: datetime


class LogUsageResponse(BaseModel):
    """Response для логирования"""
    session_id: str
    recorded: bool
    message: str


# ==================== INTERNAL SCHEMAS ====================

class SessionData(BaseModel):
    """Данные сессии (хранятся в Redis)"""
    user_id: str
    prompts_count: int
    reserved_credits: int
    created_at: datetime
    is_finalized: bool = False


class DeviceBinding(BaseModel):
    """Информация о привязанном устройстве"""
    fingerprint: str
    device_info: Optional[Dict[str, str]]
    bound_at: datetime
    last_used: Optional[datetime]

