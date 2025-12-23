"""
Pydantic схемы для billing и подписок
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class PlanResponse(BaseModel):
    """Схема плана подписки"""
    id: str
    name: str
    price_eur: Decimal = Field(..., decimal_places=2)
    credits: int
    price_per_credit: Optional[Decimal] = Field(None, decimal_places=4)
    duration_days: Optional[int] = None
    discount_percent: Optional[int] = None
    description: str
    
    class Config:
        from_attributes = True


class PurchasePlanRequest(BaseModel):
    """Схема запроса на покупку плана"""
    plan_id: str = Field(..., description="ID плана (plan_basic, plan_standard, plan_pro)")


class PurchasePlanResponse(BaseModel):
    """Схема ответа на покупку плана"""
    payment_id: str
    payment_url: str
    plan: str
    amount: Decimal = Field(..., decimal_places=2)
    currency: str = "EUR"
    expires_at: datetime


class TransactionResponse(BaseModel):
    """Схема транзакции"""
    id: str
    type: str  # 'purchase', 'refund', 'usage'
    amount: Decimal = Field(..., decimal_places=2)
    currency: str = "EUR"
    credits: int
    status: str  # 'pending', 'completed', 'failed'
    plan: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    
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
    
    class Config:
        from_attributes = True

