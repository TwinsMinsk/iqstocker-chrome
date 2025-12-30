"""
ReferralConfig Model - Настройки наград за рефералов
"""
from sqlalchemy import Column, String, Integer, Boolean
from sqlalchemy.sql import func

from app.db.base import Base, TimestampMixin


class ReferralConfig(Base, TimestampMixin):
    """Настройки реферальных наград по тарифам"""
    __tablename__ = "referral_configs"
    
    # ID тарифа из billing_service.PLANS (например "credit_500")
    tariff_plan_id = Column(String(50), primary_key=True)
    
    # Количество кредитов пригласившему
    reward_credits = Column(Integer, nullable=False, default=0)
    
    # Активна ли награда для этого тарифа
    is_active = Column(Boolean, default=True, nullable=False)
    
    def __repr__(self):
        return f"<ReferralConfig(plan={self.tariff_plan_id}, reward={self.reward_credits})>"

