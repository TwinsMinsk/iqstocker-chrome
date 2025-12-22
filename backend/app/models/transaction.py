"""
Transaction Model
"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Numeric, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from uuid import uuid4

from app.db.base import Base, TimestampMixin


class Transaction(Base, TimestampMixin):
    """Transaction model"""
    __tablename__ = "transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    amount = Column(Numeric(10, 2), nullable=False)
    credits = Column(Integer, nullable=False)
    type = Column(String(50), nullable=False)  # 'purchase', 'refund', 'usage'
    status = Column(String(50), default="pending", nullable=False, index=True)  # 'pending', 'completed', 'failed'
    
    payment_id = Column(String(255), nullable=True)  # From Tribute (period_id)
    plan_id = Column(String(50), nullable=True)
    
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="transactions")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('amount > 0', name='transactions_amount_check'),
        CheckConstraint('credits > 0', name='transactions_credits_check'),
    )
    
    def __repr__(self):
        return f"<Transaction(user_id={self.user_id}, type={self.type}, status={self.status}, amount={self.amount})>"

