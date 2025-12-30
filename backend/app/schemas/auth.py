"""
Pydantic схемы для аутентификации
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime


class RegisterRequest(BaseModel):
    """Схема для регистрации пользователя"""
    email: EmailStr
    password: str = Field(..., min_length=8)  # Минимум 8 символов, максимум проверяется в байтах
    referral_code: Optional[str] = Field(None, max_length=12, description="Реферальный код пригласившего")
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Валидация пароля: минимум 8 символов, максимум 72 байта, хотя бы одна цифра и буква"""
        if len(v) < 8:
            raise ValueError('Пароль должен содержать минимум 8 символов')
        
        # Проверка длины в байтах (bcrypt ограничение: 72 байта)
        password_bytes = v.encode('utf-8')
        if len(password_bytes) > 72:
            raise ValueError('Пароль не может быть длиннее 72 байт. Используйте более короткий пароль')
        
        if not any(char.isdigit() for char in v):
            raise ValueError('Пароль должен содержать хотя бы одну цифру')
        if not any(char.isalpha() for char in v):
            raise ValueError('Пароль должен содержать хотя бы одну букву')
        return v


class LoginRequest(BaseModel):
    """Схема для входа"""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Схема ответа с токенами"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # секунды до истечения access token


class RefreshTokenRequest(BaseModel):
    """Схема для обновления токена"""
    refresh_token: str


class GoogleOAuthRequest(BaseModel):
    """Схема для OAuth Google"""
    code: str  # Authorization code от Google
    redirect_uri: str


class EmailVerificationRequest(BaseModel):
    """Схема для верификации email"""
    token: str


class UserResponse(BaseModel):
    """Схема ответа с данными пользователя"""
    id: str
    email: str
    email_verified: bool
    is_admin: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

