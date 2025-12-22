"""
Subscription Model
"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from uuid import uuid4
from datetime import datetime

from app.db.base import Base, TimestampMixin


class Subscription(Base, TimestampMixin):
    """Subscription model"""
    __tablename__ = "subscriptions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    plan_id = Column(String(50), nullable=False)  # 'free', 'basic', 'standard', 'pro'
    status = Column(String(50), default="active", nullable=False)  # 'active', 'expired', 'cancelled'
    
    credits_balance = Column(Integer, default=0, nullable=False)
    monthly_limit = Column(Integer, nullable=True)
    used_this_month = Column(Integer, default=0, nullable=False)
    
    subscription_starts_at = Column(DateTime(timezone=True), nullable=True)
    subscription_expires_at = Column(DateTime(timezone=True), nullable=True, index=True)
    
    # Relationships
    user = relationship("User", back_populates="subscriptions")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('credits_balance >= 0', name='subscriptions_credits_check'),
        CheckConstraint('used_this_month >= 0', name='subscriptions_used_check'),
    )
    
    def is_expired(self) -> bool:
        """Проверить истёкла ли подписка"""
        if self.subscription_expires_at is None:
            return False
        return datetime.utcnow() > self.subscription_expires_at
    
    def __repr__(self):
        return f"<Subscription(user_id={self.user_id}, plan={self.plan_id}, status={self.status})>"

