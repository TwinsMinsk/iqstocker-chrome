"""
Pydantic схемы для Admin endpoints
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class AdminUserItem(BaseModel):
    """Элемент списка пользователей для админа"""
    id: str
    email: str
    balance: int = Field(..., description="Баланс кредитов")
    referrals_count: int = Field(default=0, description="Количество рефералов")
    created_at: datetime
    last_active: Optional[datetime] = None
    is_blocked: bool = Field(default=False, description="Заблокирован ли пользователь")
    is_admin: bool = False
    email_verified: bool = False
    
    class Config:
        from_attributes = True


class AdminUserListResponse(BaseModel):
    """Ответ со списком пользователей"""
    total: int
    users: List[AdminUserItem]
    pagination: dict = Field(..., description="Информация о пагинации")


class AdminUserUpdateRequest(BaseModel):
    """Запрос на обновление пользователя (админ)"""
    balance: Optional[int] = Field(None, ge=0, description="Новый баланс кредитов")
    is_blocked: Optional[bool] = Field(None, description="Заблокировать/разблокировать")
    is_admin: Optional[bool] = Field(None, description="Назначить/снять админа")


class AdminUserUpdateResponse(BaseModel):
    """Ответ после обновления пользователя"""
    id: str
    email: str
    balance: int
    is_blocked: bool
    is_admin: bool
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AdminLogItem(BaseModel):
    """Элемент лога для админа"""
    id: str
    user_id: str
    user_email: str
    session_id: str
    status: str = Field(..., description="success, error, paused, completed")
    error_type: Optional[str] = Field(None, description="rate_limit, invalid_prompt, network_error")
    error_message: Optional[str] = Field(None, description="Детали ошибки (БЕЗ промптов!)")
    prompts_count: int
    successful_count: int = 0
    failed_count: int = 0
    duration_seconds: Optional[int] = None
    timestamp: datetime
    
    class Config:
        from_attributes = True


class AdminLogListResponse(BaseModel):
    """Ответ со списком логов"""
    total: int
    logs: List[AdminLogItem]


class AdminResetPasswordRequest(BaseModel):
    """Запрос на сброс пароля пользователя (админ)"""
    new_password: str = Field(..., min_length=8, max_length=72, description="Новый пароль (минимум 8 символов)")


class AdminResetPasswordResponse(BaseModel):
    """Ответ после сброса пароля"""
    id: str
    email: str
    success: bool
    message: str
