"""
CreditTransaction Model - Аудит всех операций с кредитами
"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from uuid import uuid4
import enum

from app.db.base import Base
from app.core.config import settings

# Типы с ID_TYPE (как в user.py)
if settings.USE_SQLITE:
    ID_TYPE = String(36)
    ID_DEFAULT = lambda: str(uuid4())
else:
    ID_TYPE = UUID(as_uuid=True)
    ID_DEFAULT = uuid4


class CreditTransactionType(str, enum.Enum):
    """Типы транзакций кредитов"""
    PURCHASE = "purchase"           # Покупка через Tribute
    PROMO_CODE = "promo_code"       # Активация промокода
    REFERRAL_REWARD = "referral_reward"  # Награда за реферала
    MANUAL_ADJUSTMENT = "manual_adjustment"  # Ручное начисление админом
    REGISTRATION_BONUS = "registration_bonus"  # Бонус при регистрации
    USAGE = "usage"                 # Списание за генерацию (если будем трекать)


class CreditTransaction(Base):
    """Журнал всех операций с кредитами для полного аудита"""
    __tablename__ = "credit_transactions"
    
    id = Column(ID_TYPE, primary_key=True, default=ID_DEFAULT)
    user_id = Column(ID_TYPE, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Сумма (положительная = начисление, отрицательная = списание)
    amount = Column(Integer, nullable=False)
    
    # Тип операции
    type = Column(String(50), nullable=False, index=True)
    
    # Связанная сущность (ID промокода, ID платежа, ID реферала и т.д.)
    related_entity_id = Column(String(255), nullable=True)
    
    # Опциональное описание/комментарий (для manual_adjustment)
    description = Column(Text, nullable=True)
    
    # Баланс после операции (для быстрого аудита)
    balance_after = Column(Integer, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    user = relationship("User", backref="credit_transactions")
    
    def __repr__(self):
        return f"<CreditTransaction(user={self.user_id}, type={self.type}, amount={self.amount:+d})>"

