"""
DailyAnalytics Model - Предагрегированная статистика
"""
from sqlalchemy import Column, Date, Integer, Numeric

from app.db.base import Base


class DailyAnalytics(Base):
    """Агрегированные метрики за день (расчет через Cron)"""
    __tablename__ = "daily_analytics"
    
    # Дата как PK (одна строка на день)
    date = Column(Date, primary_key=True)
    
    # Пользователи
    new_users_count = Column(Integer, default=0, nullable=False)
    active_users_dau = Column(Integer, default=0, nullable=False)  # Уникальные генерации
    
    # Финансы
    revenue_eur = Column(Numeric(12, 2), default=0, nullable=False)
    paying_users_count = Column(Integer, default=0, nullable=False)
    
    # Активность
    total_generations = Column(Integer, default=0, nullable=False)
    total_prompts = Column(Integer, default=0, nullable=False)
    
    # Рефералка (опционально)
    new_referrals_count = Column(Integer, default=0, nullable=False)
    referral_rewards_paid = Column(Integer, default=0, nullable=False)
    
    def __repr__(self):
        return f"<DailyAnalytics(date={self.date}, dau={self.active_users_dau}, revenue={self.revenue_eur})>"

