# Master Plan: Админ-панель, Аналитика, Промокоды и Реферальная система

> **Версия:** 3.0 (Техническое Задание)  
> **Дата:** 29.12.2025  
> **Статус:** ✅ Готов к разработке  
> **Стек:** FastAPI + SQLAlchemy 2.0 + Pydantic 2.5 | Next.js 14 (App Router) + TypeScript

---

## 1. Executive Summary

Внедряем четыре ключевые функции для масштабирования бизнеса:

| Компонент | Цель | Ключевая Метрика |
|-----------|------|------------------|
| **Админ-панель** | Ручное управление балансами, просмотр метрик | Снижение нагрузки на поддержку |
| **Аналитика** | DAU/MAU, Revenue, Retention через предагрегацию | Скорость загрузки дашборда < 200ms |
| **Промокоды** | Маркетинговые акции, бонусы | Конверсия активаций |
| **Реферальная система** | Виральный рост через награды за оплаты | CAC, количество приглашенных |

---

## 2. Database Architecture (Final)

### 2.1. Обновление модели User

**Файл:** `backend/app/models/user.py`

```python
# Добавить после строки 31 (telegram_user_id):

# === REFERRAL SYSTEM ===
# Уникальный реферальный код пользователя (генерируется при регистрации)
referral_code = Column(String(12), unique=True, nullable=True, index=True)
# ID пользователя, который пригласил (если есть)
referred_by_id = Column(ID_TYPE, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

# Добавить relationship (после extension_logs):
referred_users = relationship(
    "User", 
    backref="referrer",
    foreign_keys="User.referred_by_id",
    remote_side="User.id"
)
```

> **⚠️ Важно:** Используем `ID_TYPE` (UUID/String) который уже определён в файле. `ondelete="SET NULL"` — если пригласивший удалён, реферал остаётся.

---

### 2.2. Новые Модели

**Файл:** `backend/app/models/promo_code.py` (СОЗДАТЬ)

```python
"""
PromoCode Model - Система промокодов
"""
from sqlalchemy import Column, String, Integer, DateTime, Boolean, CheckConstraint
from sqlalchemy.sql import func
from datetime import datetime

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
        if self.expires_at and datetime.utcnow() > self.expires_at:
            return False
        if self.max_uses and self.current_uses >= self.max_uses:
            return False
        return True
    
    def __repr__(self):
        return f"<PromoCode(code={self.code}, amount={self.credit_amount}, uses={self.current_uses}/{self.max_uses})>"
```

---

**Файл:** `backend/app/models/credit_transaction.py` (СОЗДАТЬ)

```python
"""
CreditTransaction Model - Аудит всех операций с кредитами
"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum, Text
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
```

---

**Файл:** `backend/app/models/referral_config.py` (СОЗДАТЬ)

```python
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
```

---

**Файл:** `backend/app/models/daily_analytics.py` (СОЗДАТЬ)

```python
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
```

---

### 2.3. Обновление `__init__.py`

**Файл:** `backend/app/models/__init__.py`

```python
"""
SQLAlchemy Models
"""
from app.models.user import User
from app.models.subscription import Subscription
from app.models.license_key import LicenseKey
from app.models.transaction import Transaction
from app.models.extension_log import ExtensionLog
# === NEW MODELS ===
from app.models.promo_code import PromoCode
from app.models.credit_transaction import CreditTransaction, CreditTransactionType
from app.models.referral_config import ReferralConfig
from app.models.daily_analytics import DailyAnalytics

__all__ = [
    "User",
    "Subscription",
    "LicenseKey",
    "Transaction",
    "ExtensionLog",
    "PromoCode",
    "CreditTransaction",
    "CreditTransactionType",
    "ReferralConfig",
    "DailyAnalytics",
]
```

---

### 2.4. Миграция Alembic

**Команда для создания:**
```bash
cd backend
poetry run alembic revision --autogenerate -m "add_promo_referral_analytics"
```

**Файл миграции (проверить и отредактировать!):**
```python
"""add_promo_referral_analytics

Revision ID: 003_xxx
Revises: 002_add_telegram_user_id
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '003_add_promo_referral_analytics'
down_revision = '002_add_telegram_user_id'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # === 1. Обновление таблицы users ===
    op.add_column('users', sa.Column('referral_code', sa.String(12), nullable=True))
    op.add_column('users', sa.Column('referred_by_id', postgresql.UUID(as_uuid=True), nullable=True))
    
    op.create_index('ix_users_referral_code', 'users', ['referral_code'], unique=True)
    op.create_index('ix_users_referred_by_id', 'users', ['referred_by_id'])
    
    op.create_foreign_key(
        'fk_users_referred_by_id', 
        'users', 'users', 
        ['referred_by_id'], ['id'], 
        ondelete='SET NULL'
    )
    
    # === 2. Таблица promo_codes ===
    op.create_table(
        'promo_codes',
        sa.Column('code', sa.String(50), primary_key=True),
        sa.Column('credit_amount', sa.Integer, nullable=False),
        sa.Column('max_uses', sa.Integer, nullable=True),
        sa.Column('current_uses', sa.Integer, default=0, nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.CheckConstraint('credit_amount > 0', name='promo_credit_positive'),
        sa.CheckConstraint('current_uses >= 0', name='promo_uses_non_negative'),
    )
    
    # === 3. Таблица credit_transactions ===
    op.create_table(
        'credit_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('amount', sa.Integer, nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('related_entity_id', sa.String(255), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('balance_after', sa.Integer, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_credit_transactions_user_id', 'credit_transactions', ['user_id'])
    op.create_index('ix_credit_transactions_type', 'credit_transactions', ['type'])
    op.create_index('ix_credit_transactions_created_at', 'credit_transactions', ['created_at'])
    
    # === 4. Таблица referral_configs ===
    op.create_table(
        'referral_configs',
        sa.Column('tariff_plan_id', sa.String(50), primary_key=True),
        sa.Column('reward_credits', sa.Integer, nullable=False, default=0),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # === 5. Таблица daily_analytics ===
    op.create_table(
        'daily_analytics',
        sa.Column('date', sa.Date, primary_key=True),
        sa.Column('new_users_count', sa.Integer, default=0, nullable=False),
        sa.Column('active_users_dau', sa.Integer, default=0, nullable=False),
        sa.Column('revenue_eur', sa.Numeric(12, 2), default=0, nullable=False),
        sa.Column('paying_users_count', sa.Integer, default=0, nullable=False),
        sa.Column('total_generations', sa.Integer, default=0, nullable=False),
        sa.Column('total_prompts', sa.Integer, default=0, nullable=False),
        sa.Column('new_referrals_count', sa.Integer, default=0, nullable=False),
        sa.Column('referral_rewards_paid', sa.Integer, default=0, nullable=False),
    )


def downgrade() -> None:
    op.drop_table('daily_analytics')
    op.drop_table('referral_configs')
    op.drop_index('ix_credit_transactions_created_at')
    op.drop_index('ix_credit_transactions_type')
    op.drop_index('ix_credit_transactions_user_id')
    op.drop_table('credit_transactions')
    op.drop_table('promo_codes')
    op.drop_constraint('fk_users_referred_by_id', 'users', type_='foreignkey')
    op.drop_index('ix_users_referred_by_id', 'users')
    op.drop_index('ix_users_referral_code', 'users')
    op.drop_column('users', 'referred_by_id')
    op.drop_column('users', 'referral_code')
```

---

## 3. Backend Implementation Guide

### 3.1. Сервис начисления кредитов (ядро системы)

**Файл:** `backend/app/services/credit_service.py` (СОЗДАТЬ)

```python
"""
CreditService - Единая точка для всех операций с кредитами.
Обеспечивает атомарность и аудит через CreditTransaction.
"""
from sqlalchemy.orm import Session
from sqlalchemy import update
from typing import Optional, Tuple
from datetime import datetime
import logging

from app.models.user import User
from app.models.subscription import Subscription
from app.models.credit_transaction import CreditTransaction, CreditTransactionType

logger = logging.getLogger(__name__)


class CreditService:
    """Централизованный сервис для всех операций с кредитами"""
    
    @staticmethod
    def add_credits(
        db: Session,
        user_id: str,
        amount: int,
        transaction_type: str,
        related_entity_id: Optional[str] = None,
        description: Optional[str] = None,
        commit: bool = True
    ) -> Tuple[Optional[int], Optional[str]]:
        """
        Атомарное начисление кредитов с записью в журнал.
        
        Args:
            db: Database session
            user_id: ID пользователя
            amount: Сумма (положительная = начисление, отрицательная = списание)
            transaction_type: Тип из CreditTransactionType
            related_entity_id: ID связанной сущности (промокод, платеж, реферал)
            description: Комментарий (для ручных начислений)
            commit: Делать ли commit (False если вызывается из другой транзакции)
        
        Returns:
            Tuple[new_balance, error_message]
        """
        try:
            # 1. Находим подписку пользователя
            subscription = db.query(Subscription).filter(
                Subscription.user_id == user_id
            ).first()
            
            if not subscription:
                return None, "Subscription not found"
            
            # 2. АТОМАРНОЕ обновление баланса через SQL (защита от Race Condition)
            # Используем UPDATE ... SET credits = credits + amount
            stmt = (
                update(Subscription)
                .where(Subscription.id == subscription.id)
                .values(credits_balance=Subscription.credits_balance + amount)
                .returning(Subscription.credits_balance)
            )
            result = db.execute(stmt)
            new_balance = result.scalar()
            
            # 3. Создаём запись в журнале транзакций
            credit_tx = CreditTransaction(
                user_id=user_id,
                amount=amount,
                type=transaction_type,
                related_entity_id=related_entity_id,
                description=description,
                balance_after=new_balance
            )
            db.add(credit_tx)
            
            if commit:
                db.commit()
            else:
                db.flush()
            
            logger.info(
                f"Credits {'added' if amount > 0 else 'deducted'}: "
                f"user={user_id}, amount={amount:+d}, type={transaction_type}, "
                f"new_balance={new_balance}"
            )
            
            return new_balance, None
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error in add_credits: {e}")
            return None, str(e)
    
    @staticmethod
    def get_transaction_history(
        db: Session,
        user_id: str,
        limit: int = 50,
        transaction_type: Optional[str] = None
    ) -> list:
        """Получить историю транзакций кредитов пользователя"""
        query = db.query(CreditTransaction).filter(
            CreditTransaction.user_id == user_id
        )
        
        if transaction_type:
            query = query.filter(CreditTransaction.type == transaction_type)
        
        return query.order_by(CreditTransaction.created_at.desc()).limit(limit).all()


credit_service = CreditService()
```

---

### 3.2. Сервис промокодов

**Файл:** `backend/app/services/promo_service.py` (СОЗДАТЬ)

```python
"""
PromoService - Управление промокодами
"""
from sqlalchemy.orm import Session
from sqlalchemy import update
from typing import Optional, Tuple
from datetime import datetime
import logging

from app.models.promo_code import PromoCode
from app.models.credit_transaction import CreditTransaction, CreditTransactionType
from app.services.credit_service import credit_service

logger = logging.getLogger(__name__)


class PromoService:
    """Сервис для работы с промокодами"""
    
    @staticmethod
    def create_promo(
        db: Session,
        code: str,
        credit_amount: int,
        max_uses: Optional[int] = None,
        expires_at: Optional[datetime] = None,
        description: Optional[str] = None
    ) -> Tuple[Optional[PromoCode], Optional[str]]:
        """Создать новый промокод (только админ)"""
        # Нормализуем код (uppercase)
        code = code.upper().strip()
        
        # Проверяем уникальность
        existing = db.query(PromoCode).filter(PromoCode.code == code).first()
        if existing:
            return None, f"Promo code '{code}' already exists"
        
        promo = PromoCode(
            code=code,
            credit_amount=credit_amount,
            max_uses=max_uses,
            expires_at=expires_at,
            description=description,
            is_active=True
        )
        
        db.add(promo)
        db.commit()
        db.refresh(promo)
        
        logger.info(f"Created promo code: {code}, amount={credit_amount}")
        return promo, None
    
    @staticmethod
    def redeem_promo(
        db: Session,
        user_id: str,
        code: str
    ) -> Tuple[Optional[int], Optional[str]]:
        """
        Активировать промокод для пользователя.
        
        Returns:
            Tuple[credits_added, error_message]
        """
        code = code.upper().strip()
        
        # 1. Находим промокод
        promo = db.query(PromoCode).filter(PromoCode.code == code).first()
        if not promo:
            return None, "Промокод не найден"
        
        # 2. Проверяем валидность
        if not promo.is_valid():
            if not promo.is_active:
                return None, "Промокод деактивирован"
            if promo.expires_at and datetime.utcnow() > promo.expires_at:
                return None, "Срок действия промокода истёк"
            if promo.max_uses and promo.current_uses >= promo.max_uses:
                return None, "Промокод исчерпан"
            return None, "Промокод недействителен"
        
        # 3. Проверяем, не использовал ли пользователь этот код ранее
        already_used = db.query(CreditTransaction).filter(
            CreditTransaction.user_id == user_id,
            CreditTransaction.type == CreditTransactionType.PROMO_CODE.value,
            CreditTransaction.related_entity_id == code
        ).first()
        
        if already_used:
            return None, "Вы уже использовали этот промокод"
        
        # 4. АТОМАРНО: Увеличиваем счётчик использований
        stmt = (
            update(PromoCode)
            .where(
                PromoCode.code == code,
                # Дополнительная проверка лимита на уровне SQL
                (PromoCode.max_uses.is_(None)) | (PromoCode.current_uses < PromoCode.max_uses)
            )
            .values(current_uses=PromoCode.current_uses + 1)
            .returning(PromoCode.current_uses)
        )
        result = db.execute(stmt)
        updated_uses = result.scalar()
        
        if updated_uses is None:
            return None, "Промокод исчерпан (конкурентный доступ)"
        
        # 5. Начисляем кредиты
        new_balance, error = credit_service.add_credits(
            db=db,
            user_id=user_id,
            amount=promo.credit_amount,
            transaction_type=CreditTransactionType.PROMO_CODE.value,
            related_entity_id=code,
            description=f"Promo code: {code}",
            commit=False
        )
        
        if error:
            db.rollback()
            return None, error
        
        db.commit()
        
        logger.info(f"Promo redeemed: user={user_id}, code={code}, credits={promo.credit_amount}")
        return promo.credit_amount, None
    
    @staticmethod
    def list_promos(db: Session, include_inactive: bool = False) -> list:
        """Получить список промокодов для админки"""
        query = db.query(PromoCode)
        if not include_inactive:
            query = query.filter(PromoCode.is_active == True)
        return query.order_by(PromoCode.created_at.desc()).all()
    
    @staticmethod
    def deactivate_promo(db: Session, code: str) -> bool:
        """Деактивировать промокод"""
        code = code.upper().strip()
        result = db.query(PromoCode).filter(PromoCode.code == code).update(
            {"is_active": False}
        )
        db.commit()
        return result > 0


promo_service = PromoService()
```

---

### 3.3. Реферальная логика

**Файл:** `backend/app/services/referral_service.py` (СОЗДАТЬ)

```python
"""
ReferralService - Реферальная система
"""
from sqlalchemy.orm import Session
from typing import Optional, Tuple
import secrets
import string
import logging

from app.models.user import User
from app.models.referral_config import ReferralConfig
from app.models.credit_transaction import CreditTransactionType
from app.services.credit_service import credit_service

logger = logging.getLogger(__name__)


class ReferralService:
    """Сервис для реферальной программы"""
    
    @staticmethod
    def generate_referral_code(length: int = 8) -> str:
        """Генерировать уникальный реферальный код"""
        # Используем буквы + цифры, исключая похожие символы (0, O, I, l)
        alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    @staticmethod
    def assign_referral_code(db: Session, user: User) -> str:
        """Назначить реферальный код пользователю (если его нет)"""
        if user.referral_code:
            return user.referral_code
        
        # Генерируем уникальный код
        max_attempts = 10
        for _ in range(max_attempts):
            code = ReferralService.generate_referral_code()
            existing = db.query(User).filter(User.referral_code == code).first()
            if not existing:
                user.referral_code = code
                db.commit()
                db.refresh(user)
                logger.info(f"Assigned referral code {code} to user {user.id}")
                return code
        
        raise Exception("Failed to generate unique referral code")
    
    @staticmethod
    def process_referral_on_register(
        db: Session,
        new_user: User,
        referral_code: Optional[str]
    ) -> Tuple[bool, Optional[str]]:
        """
        Обработать реферальный код при регистрации.
        
        Args:
            db: Database session
            new_user: Новый пользователь
            referral_code: Реферальный код (если есть)
        
        Returns:
            Tuple[success, error_message]
        """
        if not referral_code:
            return True, None
        
        referral_code = referral_code.upper().strip()
        
        # Находим пригласившего
        referrer = db.query(User).filter(User.referral_code == referral_code).first()
        
        if not referrer:
            logger.warning(f"Referral code not found: {referral_code}")
            return True, None  # Не блокируем регистрацию
        
        # === ANTI-FRAUD: Нельзя пригласить самого себя ===
        if str(referrer.id) == str(new_user.id):
            logger.warning(f"Self-referral attempt blocked: user {new_user.id}")
            return True, None  # Игнорируем, не блокируем
        
        # Записываем связь
        new_user.referred_by_id = referrer.id
        db.commit()
        
        logger.info(f"User {new_user.id} referred by {referrer.id} (code: {referral_code})")
        return True, None
    
    @staticmethod
    def process_referral_reward(
        db: Session,
        payer_user_id: str,
        plan_id: str
    ) -> Tuple[Optional[int], Optional[str]]:
        """
        Начислить реферальную награду пригласившему при оплате.
        Вызывается из PaymentService после успешной оплаты.
        
        Args:
            db: Database session
            payer_user_id: ID того, кто оплатил
            plan_id: ID оплаченного тарифа
        
        Returns:
            Tuple[reward_credits, error_message]
        """
        # 1. Находим пользователя и проверяем, есть ли referrer
        payer = db.query(User).filter(User.id == payer_user_id).first()
        if not payer or not payer.referred_by_id:
            return None, None  # Нет реферера — ничего не делаем
        
        referrer_id = payer.referred_by_id
        
        # 2. Проверяем конфиг награды для этого тарифа
        config = db.query(ReferralConfig).filter(
            ReferralConfig.tariff_plan_id == plan_id,
            ReferralConfig.is_active == True
        ).first()
        
        if not config or config.reward_credits <= 0:
            logger.info(f"No referral config for plan {plan_id}")
            return None, None
        
        # 3. Начисляем награду пригласившему
        new_balance, error = credit_service.add_credits(
            db=db,
            user_id=str(referrer_id),
            amount=config.reward_credits,
            transaction_type=CreditTransactionType.REFERRAL_REWARD.value,
            related_entity_id=str(payer_user_id),
            description=f"Referral reward: user {payer_user_id} paid for {plan_id}",
            commit=False  # Commit делает вызывающий код
        )
        
        if error:
            logger.error(f"Failed to add referral reward: {error}")
            return None, error
        
        logger.info(
            f"Referral reward: {config.reward_credits} credits to user {referrer_id} "
            f"for payment by {payer_user_id} (plan: {plan_id})"
        )
        
        return config.reward_credits, None
    
    @staticmethod
    def get_referral_stats(db: Session, user_id: str) -> dict:
        """Получить статистику рефералов для пользователя"""
        from sqlalchemy import func
        from app.models.credit_transaction import CreditTransaction
        
        # Количество приглашённых
        invited_count = db.query(User).filter(User.referred_by_id == user_id).count()
        
        # Сколько кредитов заработано на рефералах
        total_earned = db.query(func.coalesce(func.sum(CreditTransaction.amount), 0)).filter(
            CreditTransaction.user_id == user_id,
            CreditTransaction.type == CreditTransactionType.REFERRAL_REWARD.value
        ).scalar()
        
        # Получаем реферальный код
        user = db.query(User).filter(User.id == user_id).first()
        referral_code = user.referral_code if user else None
        
        return {
            "referral_code": referral_code,
            "invited_count": invited_count,
            "total_earned_credits": int(total_earned or 0)
        }
    
    @staticmethod
    def get_or_create_config(db: Session, plan_id: str) -> ReferralConfig:
        """Получить или создать конфиг награды для тарифа"""
        config = db.query(ReferralConfig).filter(
            ReferralConfig.tariff_plan_id == plan_id
        ).first()
        
        if not config:
            config = ReferralConfig(
                tariff_plan_id=plan_id,
                reward_credits=0,
                is_active=False
            )
            db.add(config)
            db.commit()
            db.refresh(config)
        
        return config
    
    @staticmethod
    def update_config(
        db: Session,
        plan_id: str,
        reward_credits: int,
        is_active: bool
    ) -> ReferralConfig:
        """Обновить конфиг награды для тарифа"""
        config = ReferralService.get_or_create_config(db, plan_id)
        config.reward_credits = reward_credits
        config.is_active = is_active
        db.commit()
        db.refresh(config)
        return config


referral_service = ReferralService()
```

---

### 3.4. Интеграция в PaymentService

**Файл:** `backend/app/services/payment_service.py`

Добавить в метод `_handle_payment` после строки 214 (`subscription.plan_id = plan_id`):

```python
# === REFERRAL REWARD HOOK ===
# После успешного начисления кредитов — проверяем реферальную награду
from app.services.referral_service import referral_service

referral_reward, ref_error = referral_service.process_referral_reward(
    db=db,
    payer_user_id=str(transaction.user_id),
    plan_id=plan_id
)

if referral_reward:
    logger.info(f"Referral reward {referral_reward} credits paid for payment {payment_id}")
# === END REFERRAL HOOK ===
```

---

### 3.5. Интеграция в AuthService

**Файл:** `backend/app/services/auth_service.py`

1. **Изменить сигнатуру `create_user`:**

```python
@staticmethod
def create_user(
    db: Session,
    email: str,
    password: str,
    oauth_google_id: Optional[str] = None,
    email_verified: bool = True,
    referral_code: Optional[str] = None  # <-- ДОБАВИТЬ
) -> Tuple[Optional[User], Optional[str]]:
```

2. **После создания пользователя (после `db.add(user)` и `db.flush()`):**

```python
# === REFERRAL SYSTEM ===
from app.services.referral_service import referral_service

# Назначаем реферальный код
referral_service.assign_referral_code(db, user)

# Обрабатываем входящий реферал (если есть)
if referral_code:
    referral_service.process_referral_on_register(db, user, referral_code)
# === END REFERRAL ===
```

3. **Обновить вызов в `oauth_google_login` (если нужно поддержать рефералы через OAuth).**

---

### 3.6. Обновление схемы регистрации

**Файл:** `backend/app/schemas/auth.py`

```python
class RegisterRequest(BaseModel):
    """Схема для регистрации пользователя"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    referral_code: Optional[str] = Field(None, max_length=12, description="Реферальный код пригласившего")
    
    # ... существующий validator для password
```

---

### 3.7. API Endpoints

**Файл:** `backend/app/api/v1/endpoints/promo.py` (СОЗДАТЬ)

```python
"""
Promo endpoints - активация промокодов пользователем
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.api.v1.dependencies import get_current_user
from app.models.user import User
from app.services.promo_service import promo_service

router = APIRouter(prefix="/promo", tags=["promo"])


class RedeemPromoRequest(BaseModel):
    code: str = Field(..., min_length=3, max_length=50)


class RedeemPromoResponse(BaseModel):
    success: bool
    credits_added: int
    message: str


@router.post("/redeem", response_model=RedeemPromoResponse)
async def redeem_promo(
    request: RedeemPromoRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Активировать промокод для текущего пользователя"""
    credits, error = promo_service.redeem_promo(
        db=db,
        user_id=str(user.id),
        code=request.code
    )
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    return RedeemPromoResponse(
        success=True,
        credits_added=credits,
        message=f"Промокод активирован! Начислено {credits} кредитов."
    )
```

---

**Файл:** `backend/app/api/v1/endpoints/admin.py` — добавить эндпоинты:

```python
# === PROMO MANAGEMENT ===

from app.services.promo_service import promo_service
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class CreatePromoRequest(BaseModel):
    code: str = Field(..., min_length=3, max_length=50)
    credit_amount: int = Field(..., gt=0)
    max_uses: Optional[int] = Field(None, gt=0)
    expires_at: Optional[datetime] = None
    description: Optional[str] = None


class PromoResponse(BaseModel):
    code: str
    credit_amount: int
    max_uses: Optional[int]
    current_uses: int
    expires_at: Optional[datetime]
    is_active: bool
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/promocodes", response_model=List[PromoResponse])
async def list_promocodes(
    include_inactive: bool = Query(False),
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Получить список всех промокодов"""
    promos = promo_service.list_promos(db, include_inactive)
    return promos


@router.post("/promocodes", response_model=PromoResponse, status_code=status.HTTP_201_CREATED)
async def create_promocode(
    request: CreatePromoRequest,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Создать новый промокод"""
    promo, error = promo_service.create_promo(
        db=db,
        code=request.code,
        credit_amount=request.credit_amount,
        max_uses=request.max_uses,
        expires_at=request.expires_at,
        description=request.description
    )
    
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
    
    return promo


@router.delete("/promocodes/{code}")
async def deactivate_promocode(
    code: str,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Деактивировать промокод"""
    success = promo_service.deactivate_promo(db, code)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Promo code not found")
    return {"message": "Promo code deactivated"}


# === REFERRAL CONFIG ===

from app.services.referral_service import referral_service
from app.services.billing_service import PLANS


class ReferralConfigResponse(BaseModel):
    tariff_plan_id: str
    plan_name: str
    reward_credits: int
    is_active: bool


class UpdateReferralConfigRequest(BaseModel):
    reward_credits: int = Field(..., ge=0)
    is_active: bool


@router.get("/referrals/config", response_model=List[ReferralConfigResponse])
async def get_referral_configs(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Получить настройки реферальных наград для всех тарифов"""
    configs = []
    for plan_id, plan_data in PLANS.items():
        config = referral_service.get_or_create_config(db, plan_id)
        configs.append(ReferralConfigResponse(
            tariff_plan_id=plan_id,
            plan_name=plan_data["name"],
            reward_credits=config.reward_credits,
            is_active=config.is_active
        ))
    return configs


@router.put("/referrals/config/{plan_id}", response_model=ReferralConfigResponse)
async def update_referral_config(
    plan_id: str,
    request: UpdateReferralConfigRequest,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Обновить настройки реферальной награды для тарифа"""
    if plan_id not in PLANS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    
    config = referral_service.update_config(
        db=db,
        plan_id=plan_id,
        reward_credits=request.reward_credits,
        is_active=request.is_active
    )
    
    return ReferralConfigResponse(
        tariff_plan_id=plan_id,
        plan_name=PLANS[plan_id]["name"],
        reward_credits=config.reward_credits,
        is_active=config.is_active
    )


# === ANALYTICS DASHBOARD ===

from app.models.daily_analytics import DailyAnalytics
from datetime import date, timedelta


class DashboardStatsResponse(BaseModel):
    period_start: date
    period_end: date
    total_users: int
    new_users: int
    total_revenue_eur: float
    total_generations: int
    dau_average: float
    new_referrals: int


@router.get("/analytics/dashboard", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    days: int = Query(30, ge=1, le=365),
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Получить статистику дашборда за период"""
    from sqlalchemy import func
    from app.models.user import User as UserModel
    
    end_date = date.today()
    start_date = end_date - timedelta(days=days)
    
    # Агрегируем из daily_analytics
    stats = db.query(
        func.coalesce(func.sum(DailyAnalytics.new_users_count), 0).label('new_users'),
        func.coalesce(func.sum(DailyAnalytics.revenue_eur), 0).label('revenue'),
        func.coalesce(func.sum(DailyAnalytics.total_generations), 0).label('generations'),
        func.coalesce(func.avg(DailyAnalytics.active_users_dau), 0).label('dau_avg'),
        func.coalesce(func.sum(DailyAnalytics.new_referrals_count), 0).label('referrals'),
    ).filter(
        DailyAnalytics.date >= start_date,
        DailyAnalytics.date <= end_date
    ).first()
    
    total_users = db.query(func.count(UserModel.id)).scalar()
    
    return DashboardStatsResponse(
        period_start=start_date,
        period_end=end_date,
        total_users=total_users,
        new_users=int(stats.new_users or 0),
        total_revenue_eur=float(stats.revenue or 0),
        total_generations=int(stats.generations or 0),
        dau_average=float(stats.dau_avg or 0),
        new_referrals=int(stats.referrals or 0)
    )
```

---

### 3.8. Cron-задача для Daily Analytics

**Файл:** `backend/app/services/analytics_service.py` (СОЗДАТЬ)

```python
"""
AnalyticsService - Сборщик ежедневной статистики
Запускается через Cron (Railway Cron Job или Celery Beat)
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, cast, Date
from datetime import date, datetime, timedelta
from decimal import Decimal
import logging

from app.models.daily_analytics import DailyAnalytics
from app.models.user import User
from app.models.transaction import Transaction
from app.models.extension_log import ExtensionLog

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Сервис для сбора и агрегации аналитики"""
    
    @staticmethod
    def collect_daily_stats(db: Session, target_date: date = None) -> DailyAnalytics:
        """
        Собрать статистику за указанный день.
        По умолчанию — за вчера.
        
        Запускать через Cron ежедневно в 00:05 UTC.
        """
        if target_date is None:
            target_date = date.today() - timedelta(days=1)
        
        logger.info(f"Collecting analytics for {target_date}")
        
        # Границы дня
        day_start = datetime.combine(target_date, datetime.min.time())
        day_end = datetime.combine(target_date, datetime.max.time())
        
        # 1. Новые пользователи
        new_users = db.query(func.count(User.id)).filter(
            cast(User.created_at, Date) == target_date
        ).scalar() or 0
        
        # 2. DAU (уникальные пользователи с генерациями)
        dau = db.query(func.count(distinct(ExtensionLog.user_id))).filter(
            ExtensionLog.timestamp >= day_start,
            ExtensionLog.timestamp <= day_end,
            ExtensionLog.status.in_(['success', 'completed'])
        ).scalar() or 0
        
        # 3. Revenue (сумма успешных транзакций)
        revenue = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
            Transaction.completed_at >= day_start,
            Transaction.completed_at <= day_end,
            Transaction.status == 'completed'
        ).scalar() or Decimal('0')
        
        # 4. Paying users (уникальные плательщики)
        paying_users = db.query(func.count(distinct(Transaction.user_id))).filter(
            Transaction.completed_at >= day_start,
            Transaction.completed_at <= day_end,
            Transaction.status == 'completed'
        ).scalar() or 0
        
        # 5. Total generations
        total_gens = db.query(func.coalesce(func.sum(ExtensionLog.successful_count), 0)).filter(
            ExtensionLog.timestamp >= day_start,
            ExtensionLog.timestamp <= day_end
        ).scalar() or 0
        
        # 6. Total prompts
        total_prompts = db.query(func.coalesce(func.sum(ExtensionLog.prompts_count), 0)).filter(
            ExtensionLog.timestamp >= day_start,
            ExtensionLog.timestamp <= day_end
        ).scalar() or 0
        
        # 7. New referrals
        new_referrals = db.query(func.count(User.id)).filter(
            cast(User.created_at, Date) == target_date,
            User.referred_by_id.isnot(None)
        ).scalar() or 0
        
        # 8. Referral rewards paid
        from app.models.credit_transaction import CreditTransaction, CreditTransactionType
        rewards_paid = db.query(func.coalesce(func.sum(CreditTransaction.amount), 0)).filter(
            cast(CreditTransaction.created_at, Date) == target_date,
            CreditTransaction.type == CreditTransactionType.REFERRAL_REWARD.value
        ).scalar() or 0
        
        # Upsert в daily_analytics
        existing = db.query(DailyAnalytics).filter(DailyAnalytics.date == target_date).first()
        
        if existing:
            existing.new_users_count = new_users
            existing.active_users_dau = dau
            existing.revenue_eur = revenue
            existing.paying_users_count = paying_users
            existing.total_generations = total_gens
            existing.total_prompts = total_prompts
            existing.new_referrals_count = new_referrals
            existing.referral_rewards_paid = rewards_paid
            analytics = existing
        else:
            analytics = DailyAnalytics(
                date=target_date,
                new_users_count=new_users,
                active_users_dau=dau,
                revenue_eur=revenue,
                paying_users_count=paying_users,
                total_generations=total_gens,
                total_prompts=total_prompts,
                new_referrals_count=new_referrals,
                referral_rewards_paid=rewards_paid
            )
            db.add(analytics)
        
        db.commit()
        db.refresh(analytics)
        
        logger.info(
            f"Analytics collected for {target_date}: "
            f"DAU={dau}, new_users={new_users}, revenue={revenue}"
        )
        
        return analytics
    
    @staticmethod
    def backfill(db: Session, days: int = 30):
        """Заполнить статистику за последние N дней"""
        today = date.today()
        for i in range(days, 0, -1):
            target = today - timedelta(days=i)
            AnalyticsService.collect_daily_stats(db, target)
            logger.info(f"Backfilled: {target}")


analytics_service = AnalyticsService()
```

**Скрипт для Cron (Railway):** `backend/scripts/collect_analytics.py`

```python
#!/usr/bin/env python3
"""
Скрипт для сбора ежедневной аналитики.
Запускать через Railway Cron: 0 5 0 * * * (каждый день в 00:05 UTC)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.services.analytics_service import analytics_service

def main():
    db = SessionLocal()
    try:
        analytics_service.collect_daily_stats(db)
        print("Analytics collected successfully")
    finally:
        db.close()

if __name__ == "__main__":
    main()
```

---

## 4. Frontend Implementation Guide

### 4.1. Middleware для атрибуции рефералов

**Файл:** `frontend/middleware.ts` (СОЗДАТЬ)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Проверяем параметр ref в URL
  const refCode = request.nextUrl.searchParams.get('ref');
  
  if (refCode) {
    // Сохраняем в cookie на 30 дней
    response.cookies.set('ref_code', refCode.toUpperCase(), {
      maxAge: 60 * 60 * 24 * 30, // 30 дней
      path: '/',
      httpOnly: false, // Доступен из JS для отправки при регистрации
      sameSite: 'lax',
    });
  }
  
  return response;
}

// Применяем middleware ко всем страницам
export const config = {
  matcher: [
    // Исключаем API и статику
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

---

### 4.2. Обновление формы регистрации

**Файл:** `frontend/components/auth/RegisterForm.tsx`

Добавить чтение реферального кода из cookie и отправку на бэкенд:

```typescript
// Добавить в начало компонента:
import Cookies from 'js-cookie'; // npm install js-cookie @types/js-cookie

// В handleSubmit перед вызовом register:
const refCode = Cookies.get('ref_code');

try {
  await register(email, password, refCode); // Передаём refCode
  Cookies.remove('ref_code'); // Удаляем после успешной регистрации
  router.push('/dashboard');
} catch (err: any) {
  // ... обработка ошибок
}
```

**Обновить `frontend/services/api/auth.ts`:**

```typescript
interface RegisterPayload {
  email: string;
  password: string;
  referral_code?: string;
}

async register(email: string, password: string, referralCode?: string): Promise<TokenResponse> {
  const payload: RegisterPayload = { email, password };
  if (referralCode) {
    payload.referral_code = referralCode;
  }
  const response = await api.post<TokenResponse>('/auth/register', payload);
  return response.data;
}
```

---

### 4.3. API сервис для админки

**Файл:** `frontend/services/api/admin.ts` — добавить:

```typescript
// === PROMO CODES ===

export interface PromoCode {
  code: string;
  credit_amount: number;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
}

export interface CreatePromoRequest {
  code: string;
  credit_amount: number;
  max_uses?: number;
  expires_at?: string;
  description?: string;
}

// === REFERRAL CONFIG ===

export interface ReferralConfig {
  tariff_plan_id: string;
  plan_name: string;
  reward_credits: number;
  is_active: boolean;
}

export interface UpdateReferralConfigRequest {
  reward_credits: number;
  is_active: boolean;
}

// === ANALYTICS ===

export interface DashboardStats {
  period_start: string;
  period_end: string;
  total_users: number;
  new_users: number;
  total_revenue_eur: number;
  total_generations: number;
  dau_average: number;
  new_referrals: number;
}

export const adminAPI = {
  // ... существующие методы ...

  // Promo codes
  async getPromoCodes(includeInactive = false): Promise<PromoCode[]> {
    const response = await api.get<PromoCode[]>('/admin/promocodes', {
      params: { include_inactive: includeInactive },
    });
    return response.data;
  },

  async createPromoCode(data: CreatePromoRequest): Promise<PromoCode> {
    const response = await api.post<PromoCode>('/admin/promocodes', data);
    return response.data;
  },

  async deactivatePromoCode(code: string): Promise<void> {
    await api.delete(`/admin/promocodes/${code}`);
  },

  // Referral config
  async getReferralConfigs(): Promise<ReferralConfig[]> {
    const response = await api.get<ReferralConfig[]>('/admin/referrals/config');
    return response.data;
  },

  async updateReferralConfig(planId: string, data: UpdateReferralConfigRequest): Promise<ReferralConfig> {
    const response = await api.put<ReferralConfig>(`/admin/referrals/config/${planId}`, data);
    return response.data;
  },

  // Analytics
  async getDashboardStats(days = 30): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>('/admin/analytics/dashboard', {
      params: { days },
    });
    return response.data;
  },
};
```

---

### 4.4. Структура страниц админки

```
frontend/app/admin/
├── layout.tsx         # Существует
├── page.tsx           # Dashboard (добавить графики)
├── users/
│   └── page.tsx       # Существует (добавить редактор баланса)
├── marketing/
│   ├── page.tsx       # Промокоды + Рефералка
│   └── promocodes/
│       └── page.tsx   # Детальное управление промокодами
└── analytics/
    └── page.tsx       # Подробная аналитика
```

---

### 4.5. Раздел "Бонусы" в личном кабинете

**Файл:** `frontend/app/dashboard/referral/page.tsx` (СОЗДАТЬ)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api/client';

interface ReferralStats {
  referral_code: string;
  invited_count: number;
  total_earned_credits: number;
}

export default function ReferralPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get<ReferralStats>('/users/me/referral');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch referral stats', error);
    }
  };

  const copyLink = () => {
    if (stats?.referral_code) {
      const link = `${window.location.origin}/register?ref=${stats.referral_code}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!stats) return <div>Загрузка...</div>;

  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${stats.referral_code}`;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Реферальная программа</h1>
      
      {/* Ваша ссылка */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Ваша пригласительная ссылка</h2>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="flex-1 px-4 py-3 bg-black/40 border border-white/20 rounded-xl text-white/80 text-sm"
          />
          <button
            onClick={copyLink}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium transition-colors"
          >
            {copied ? '✓ Скопировано' : 'Копировать'}
          </button>
        </div>
        <p className="text-white/40 text-sm mt-3">
          Поделитесь ссылкой с друзьями и получайте бонусные кредиты за их покупки!
        </p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
          <div className="text-4xl font-bold text-indigo-400">{stats.invited_count}</div>
          <div className="text-white/50 mt-2">Приглашено друзей</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
          <div className="text-4xl font-bold text-green-400">{stats.total_earned_credits}</div>
          <div className="text-white/50 mt-2">Заработано кредитов</div>
        </div>
      </div>
    </div>
  );
}
```

---

## 5. Testing Strategy

### 5.1. Backend Unit Tests

**Файл:** `backend/tests/test_referral.py` (СОЗДАТЬ)

```python
"""
Тесты реферальной системы
"""
import pytest
from app.services.referral_service import referral_service
from app.services.credit_service import credit_service
from app.models.referral_config import ReferralConfig


class TestReferralService:
    """Тесты ReferralService"""
    
    def test_generate_referral_code_uniqueness(self):
        """Коды должны быть уникальными"""
        codes = set(referral_service.generate_referral_code() for _ in range(100))
        assert len(codes) == 100
    
    def test_self_referral_blocked(self, db, user):
        """Нельзя пригласить самого себя"""
        user.referral_code = "TESTCODE"
        db.commit()
        
        success, error = referral_service.process_referral_on_register(
            db=db,
            new_user=user,
            referral_code="TESTCODE"
        )
        
        assert success is True  # Не блокируем регистрацию
        assert user.referred_by_id is None  # Но связь не создаётся
    
    def test_referral_reward_on_payment(self, db, referrer, payer):
        """Награда начисляется при оплате реферала"""
        # Setup: связь реферала
        payer.referred_by_id = referrer.id
        
        # Setup: конфиг награды
        config = ReferralConfig(
            tariff_plan_id="credit_500",
            reward_credits=50,
            is_active=True
        )
        db.add(config)
        db.commit()
        
        # Act
        reward, error = referral_service.process_referral_reward(
            db=db,
            payer_user_id=str(payer.id),
            plan_id="credit_500"
        )
        
        # Assert
        assert error is None
        assert reward == 50
        
        # Проверяем баланс реферера
        from app.models.subscription import Subscription
        sub = db.query(Subscription).filter(Subscription.user_id == referrer.id).first()
        # Баланс должен увеличиться на 50
```

### 5.2. QA Checklist

```markdown
## Backend Checklist

- [ ] Миграция применяется без ошибок: `poetry run alembic upgrade head`
- [ ] Новые модели создаются корректно (проверить через psql)
- [ ] Реферальный код генерируется при регистрации
- [ ] Anti-fraud: self-referral блокируется
- [ ] Промокод нельзя использовать дважды одному юзеру
- [ ] Промокод с max_uses блокируется после исчерпания
- [ ] Атомарность: параллельные запросы не "теряют" кредиты
- [ ] PaymentService вызывает referral_service.process_referral_reward

## Frontend Checklist

- [ ] Middleware сохраняет ref_code в cookie
- [ ] RegisterForm отправляет referral_code при регистрации
- [ ] Cookie удаляется после успешной регистрации
- [ ] Страница /dashboard/referral показывает ссылку и статистику
- [ ] Кнопка копирования работает
- [ ] Админка: список промокодов загружается
- [ ] Админка: создание промокода работает
- [ ] Админка: настройка реферальных наград работает

## Integration Checklist

- [ ] Полный flow: A регистрируется по ссылке B → A покупает → B получает бонус
- [ ] Cron-задача analytics собирает данные корректно
```

### 5.3. SQL-запросы для ручной проверки

```sql
-- Проверить реферальные связи
SELECT 
    u.email as user_email,
    u.referral_code,
    r.email as referrer_email
FROM users u
LEFT JOIN users r ON u.referred_by_id = r.id
WHERE u.referred_by_id IS NOT NULL;

-- Проверить начисления по типам
SELECT 
    type,
    COUNT(*) as count,
    SUM(amount) as total_credits
FROM credit_transactions
GROUP BY type
ORDER BY total_credits DESC;

-- Проверить использование промокодов
SELECT 
    code,
    credit_amount,
    max_uses,
    current_uses,
    is_active
FROM promo_codes
ORDER BY created_at DESC;

-- Топ рефереров
SELECT 
    u.email,
    u.referral_code,
    COUNT(referred.id) as invited_count,
    COALESCE(SUM(ct.amount), 0) as earned_credits
FROM users u
LEFT JOIN users referred ON referred.referred_by_id = u.id
LEFT JOIN credit_transactions ct ON ct.user_id = u.id AND ct.type = 'referral_reward'
WHERE u.referral_code IS NOT NULL
GROUP BY u.id
ORDER BY invited_count DESC
LIMIT 20;
```

---

## 6. Deployment & Release Plan

### 6.1. Порядок деплоя

1. **Backend (Railway):**
   ```bash
   # 1. Применить миграции
   poetry run alembic upgrade head
   
   # 2. Деплой кода (автоматически через Railway)
   git push origin main
   ```

2. **Настройка Cron-задачи (Railway):**
   - Создать новый сервис типа "Cron Job"
   - Команда: `python scripts/collect_analytics.py`
   - Schedule: `5 0 * * *` (каждый день в 00:05 UTC)

3. **Frontend (Vercel/Railway):**
   ```bash
   # Установить js-cookie
   npm install js-cookie @types/js-cookie
   
   # Деплой
   git push origin main
   ```

4. **Инициализация данных:**
   ```sql
   -- Создать начальные конфиги для рефералки
   INSERT INTO referral_configs (tariff_plan_id, reward_credits, is_active) VALUES
   ('credit_500', 25, true),
   ('credit_2500', 100, true),
   ('credit_5000', 200, true),
   ('credit_10000', 400, true);
   
   -- Backfill аналитики за последние 30 дней
   -- Запустить: python -c "from app.services.analytics_service import analytics_service; from app.db.session import SessionLocal; analytics_service.backfill(SessionLocal(), 30)"
   ```

### 6.2. Rollback план

```bash
# Откат миграции (если что-то пошло не так)
poetry run alembic downgrade -1

# Откат кода через Railway UI или:
git revert HEAD
git push origin main
```

---

## 7. Security Considerations

| Риск | Митигация |
|------|-----------|
| Self-referral | Проверка `referrer.id != new_user.id` в `process_referral_on_register` |
| Promo code brute-force | Rate limiting на `/promo/redeem` (добавить в будущем) |
| Race condition на балансе | Атомарный UPDATE через `credit_service.add_credits` |
| Повторное использование промокода | Проверка в `CreditTransaction` перед начислением |
| Admin-only endpoints | Зависимость `get_current_admin_user` на всех `/admin/*` роутах |

---

## 8. Future Improvements (Post-MVP)

- [ ] Многоуровневая реферальная программа (награда за рефералов второго уровня)
- [ ] Временные промокоды с ограниченным окном активации
- [ ] Webhook-уведомления о новых рефералах в Telegram
- [ ] A/B тестирование размера реферальных наград
- [ ] Retention-аналитика (когортный анализ)

---

**Документ готов к использованию. При вопросах — обращайтесь к автору плана.**
