"""
Pydantic схемы для billing и подписок
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class PlanResponse(BaseModel):
    """Схема плана подписки"""
    id: str
    name: str
    price_eur: Decimal = Field(..., description="Цена в EUR с точностью до 2 знаков")
    credits: int
    price_per_credit: Optional[Decimal] = Field(None, description="Цена за кредит с точностью до 4 знаков")
    duration_days: Optional[int] = None
    discount_percent: Optional[int] = None
    description: str
    
    @field_validator('price_eur')
    @classmethod
    def validate_price_eur(cls, v: Decimal) -> Decimal:
        """Проверка количества знаков после запятой (максимум 2)"""
        str_value = str(v)
        if '.' in str_value:
            decimal_part = str_value.split('.')[1]
            if len(decimal_part) > 2:
                raise ValueError('price_eur должен иметь максимум 2 знака после запятой')
        return v
    
    @field_validator('price_per_credit')
    @classmethod
    def validate_price_per_credit(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        """Проверка количества знаков после запятой (максимум 4)"""
        if v is not None:
            str_value = str(v)
            if '.' in str_value:
                decimal_part = str_value.split('.')[1]
                if len(decimal_part) > 4:
                    raise ValueError('price_per_credit должен иметь максимум 4 знака после запятой')
        return v
    
    class Config:
        from_attributes = True


class PurchasePlanRequest(BaseModel):
    """Схема запроса на покупку пакета кредитов"""
    plan_id: str = Field(..., description="ID пакета (credit_500, credit_1000, credit_2000, credit_5000)")


class PurchasePlanResponse(BaseModel):
    """Схема ответа на покупку плана"""
    payment_id: str
    payment_url: str
    plan: str
    amount: Decimal = Field(..., description="Сумма с точностью до 2 знаков")
    currency: str = "EUR"
    expires_at: datetime
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        """Проверка количества знаков после запятой (максимум 2)"""
        str_value = str(v)
        if '.' in str_value:
            decimal_part = str_value.split('.')[1]
            if len(decimal_part) > 2:
                raise ValueError('amount должен иметь максимум 2 знака после запятой')
        return v


class TransactionResponse(BaseModel):
    """Схема транзакции"""
    id: str
    type: str  # 'purchase', 'refund', 'usage'
    amount: Decimal = Field(..., description="Сумма с точностью до 2 знаков")
    currency: str = "EUR"
    credits: int
    status: str  # 'pending', 'completed', 'failed'
    plan: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        """Проверка количества знаков после запятой (максимум 2)"""
        str_value = str(v)
        if '.' in str_value:
            decimal_part = str_value.split('.')[1]
            if len(decimal_part) > 2:
                raise ValueError('amount должен иметь максимум 2 знака после запятой')
        return v
    
    class Config:
        from_attributes = True


class TransactionsListResponse(BaseModel):
    """Схема списка транзакций"""
    total: int
    transactions: List[TransactionResponse]
    pagination: dict


class SubscriptionResponse(BaseModel):
    """Схема подписки пользователя"""
    id: str
    plan_id: str
    status: str
    credits_balance: int
    monthly_limit: Optional[int] = None
    used_this_month: int
    subscription_starts_at: Optional[datetime] = None
    subscription_expires_at: Optional[datetime] = None
    
    @field_validator('id', mode='before')
    @classmethod
    def convert_id_to_string(cls, v):
        """Конвертировать UUID в строку"""
        if v is not None:
            return str(v)
        return v
    
    class Config:
        from_attributes = True

