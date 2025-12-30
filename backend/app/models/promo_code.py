"""
PromoCode Model - Система промокодов
"""
from sqlalchemy import Column, String, Integer, DateTime, Boolean, CheckConstraint
from sqlalchemy.sql import func
from datetime import datetime, timezone

from app.db.base import Base, TimestampMixin


class PromoCode(Base, TimestampMixin):
    """Промокод для начисления кредитов"""
    __tablename__ = "promo_codes"
    
    # Код как PK (уникальный, человекочитаемый)
    code = Column(String(50), primary_key=True, index=True)
    
    # Параметры промокода
    credit_amount = Column(Integer, nullable=False)
    max_uses = Column(Integer, nullable=True)  # NULL = безлимитный
    current_uses = Column(Integer, default=0, nullable=False)
    
    # Срок действия
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Опционально: описание для админки
    description = Column(String(255), nullable=True)
    
    __table_args__ = (
        CheckConstraint('credit_amount > 0', name='promo_credit_positive'),
        CheckConstraint('current_uses >= 0', name='promo_uses_non_negative'),
    )
    
    def is_valid(self) -> bool:
        """Проверить валидность промокода"""
        if not self.is_active:
            return False
        if self.expires_at:
            # expires_at хранится как timezone-aware (timezone=True),
            # а datetime.utcnow() возвращает naive datetime.
            # Нормализуем к UTC-aware, чтобы избежать TypeError (naive vs aware).
            now_utc = datetime.now(timezone.utc)
            expires_at = self.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if now_utc > expires_at:
                return False
        if self.max_uses and self.current_uses >= self.max_uses:
            return False
        return True
    
    def __repr__(self):
        return f"<PromoCode(code={self.code}, amount={self.credit_amount}, uses={self.current_uses}/{self.max_uses})>"

