"""
Pydantic схемы для пользователей
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
from decimal import Decimal


class BalanceInfo(BaseModel):
    """Информация о балансе"""
    credits: int
    eur_equivalent: Decimal = Field(..., description="Эквивалент в EUR с точностью до 2 знаков")
    
    @field_validator('eur_equivalent')
    @classmethod
    def validate_decimal_places(cls, v: Decimal) -> Decimal:
        """Проверка количества знаков после запятой (максимум 2)"""
        # Преобразуем в строку и проверяем количество знаков после точки
        str_value = str(v)
        if '.' in str_value:
            decimal_part = str_value.split('.')[1]
            if len(decimal_part) > 2:
                raise ValueError('eur_equivalent должен иметь максимум 2 знака после запятой')
        return v


class SubscriptionInfo(BaseModel):
    """Информация о подписке"""
    tier: str
    expires_at: Optional[datetime] = None
    monthly_limit: Optional[int] = None
    used_this_month: int
    renewal_date: Optional[str] = None


class LicenseKeyInfo(BaseModel):
    """Информация о лицензионном ключе"""
    id: str
    display: str
    created_at: datetime
    last_used: Optional[datetime] = None
    active: bool
    
    class Config:
        from_attributes = True


class UserProfileResponse(BaseModel):
    """Полный профиль пользователя"""
    id: str
    email: str
    is_admin: bool
    email_verified: bool
    created_at: datetime
    balance: BalanceInfo
    subscription: SubscriptionInfo
    license_key: LicenseKeyInfo
    
    class Config:
        from_attributes = True


class UpdateUserRequest(BaseModel):
    """Запрос на обновление профиля"""
    email: Optional[EmailStr] = None


class ChangePasswordRequest(BaseModel):
    """Запрос на смену пароля"""
    old_password: str = Field(..., min_length=8)
    new_password: str = Field(..., min_length=8)  # Минимум 8 символов, максимум проверяется в байтах
    
    def validate_passwords(self) -> Optional[str]:
        """Валидация паролей"""
        if len(self.new_password) < 8:
            return "Пароль должен содержать минимум 8 символов"
        
        # Проверка длины в байтах (bcrypt ограничение: 72 байта)
        password_bytes = self.new_password.encode('utf-8')
        if len(password_bytes) > 72:
            return "Пароль не может быть длиннее 72 байт. Используйте более короткий пароль"
        
        if not any(char.isdigit() for char in self.new_password):
            return "Пароль должен содержать хотя бы одну цифру"
        if not any(char.isalpha() for char in self.new_password):
            return "Пароль должен содержать хотя бы одну букву"
        return None


class LicenseKeyResponse(BaseModel):
    """Ответ с лицензионным ключом"""
    id: str
    display: str
    created_at: datetime
    active: bool
    
    class Config:
        from_attributes = True

