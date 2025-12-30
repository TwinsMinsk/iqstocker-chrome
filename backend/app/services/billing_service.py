"""
Сервис для работы с billing и подписками
"""
from sqlalchemy.orm import Session
from typing import Optional, Dict, List
from datetime import datetime, timedelta
from decimal import Decimal
import logging
import httpx

from app.models.subscription import Subscription
from app.models.transaction import Transaction
from app.models.user import User
from app.core.config import settings
from app.services.app_settings_service import app_settings_service

logger = logging.getLogger(__name__)


# Константы планов (теперь пакеты кредитов)
PLANS = {
    "credit_500": {
        "id": "credit_500",
        "name": "500 Credits",
        "price_eur": Decimal("2.00"),
        "credits": 500,
        "price_per_credit": Decimal("0.004"),
        "duration_days": 365,  # Кредиты не сгорают быстро
        "description": "Базовый пакет кредитов",
        "tribute_link": "https://tribute.to/your-bot?product=credit_500"  # Замените на реальную ссылку
    },
    "credit_2500": {
        "id": "credit_2500",
        "name": "2500 Credits",
        "price_eur": Decimal("9.00"),
        "credits": 2500,
        "price_per_credit": Decimal("0.0036"),
        "duration_days": 365,
        "discount_percent": 10,
        "description": "Популярный пакет кредитов",
        "tribute_link": "https://tribute.to/your-bot?product=credit_2500"
    },
    "credit_5000": {
        "id": "credit_5000",
        "name": "5000 Credits",
        "price_eur": Decimal("16.00"),
        "credits": 5000,
        "price_per_credit": Decimal("0.0032"),
        "duration_days": 365,
        "discount_percent": 20,
        "description": "Выгодный пакет кредитов",
        "tribute_link": "https://tribute.to/your-bot?product=credit_5000"
    },
    "credit_10000": {
        "id": "credit_10000",
        "name": "10000 Credits",
        "price_eur": Decimal("24.00"),
        "credits": 10000,
        "price_per_credit": Decimal("0.0024"),
        "duration_days": 365,
        "discount_percent": 40,
        "description": "Максимальная выгода",
        "tribute_link": "https://tribute.to/your-bot?product=credit_10000"
    }
}


class BillingService:
    """Сервис для работы с billing"""
    
    @staticmethod
    def get_plans() -> List[Dict]:
        """Получить список всех доступных планов"""
        return list(PLANS.values())
    
    @staticmethod
    def get_plan(plan_id: str) -> Optional[Dict]:
        """Получить план по ID"""
        return PLANS.get(plan_id)
    
    @staticmethod
    async def create_payment(
        db: Session,
        user: User,
        plan_id: str
    ) -> Dict:
        """
        Создать платеж через Tribute API
        
        Args:
            db: Database session
            user: User объект
            plan_id: ID плана
        
        Returns:
            Dict с payment_id и payment_url
        """
        plan = BillingService.get_plan(plan_id)
        if not plan:
            raise ValueError(f"Invalid plan_id: {plan_id}")
        
        if plan_id == "plan_free":
            raise ValueError("Free plan cannot be purchased")
        
        # Создать транзакцию в БД
        transaction = Transaction(
            user_id=user.id,
            amount=plan["price_eur"],
            credits=plan["credits"],
            type="purchase",
            status="pending",
            plan_id=plan_id
        )
        
        db.add(transaction)
        db.flush()
        
        # Создать платеж в Tribute
        # Мы используем ссылки из настроек планов, добавляя user_id для отслеживания
        tribute_url = app_settings_service.get_plan_payment_link(db, plan_id) or plan.get("tribute_link", "https://tribute.to/your-bot")
        
        # Если ссылка ведет на бота, добавляем start параметр с ID пользователя
        if "?" in tribute_url:
            payment_url = f"{tribute_url}&user_id={user.id}&plan_id={plan_id}"
        else:
            # Для чистых ссылок добавляем как первый параметр
            # ВНИМАНИЕ: Для Tribute.to это может потребовать ручного ввода ID пользователем
            # если не используется создание инвойса через API
            payment_url = f"{tribute_url}?user_id={user.id}&plan_id={plan_id}"
            
        transaction.payment_id = f"tribute_pending_{transaction.id}"
        db.commit()
        
        return {
            "payment_id": str(transaction.id),
            "payment_url": payment_url,
            "plan": plan["name"],
            "amount": plan["price_eur"],
            "currency": "EUR",
            "expires_at": datetime.utcnow() + timedelta(hours=1)
        }
    
    @staticmethod
    def get_user_transactions(
        db: Session,
        user_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> Dict:
        """
        Получить транзакции пользователя
        
        Args:
            db: Database session
            user_id: ID пользователя
            limit: Лимит записей
            offset: Смещение
        
        Returns:
            Dict с транзакциями и пагинацией
        """
        query = db.query(Transaction).filter(
            Transaction.user_id == user_id
        ).order_by(Transaction.created_at.desc())
        
        total = query.count()
        transactions = query.limit(limit).offset(offset).all()
        
        return {
            "total": total,
            "transactions": transactions,
            "pagination": {
                "limit": limit,
                "offset": offset,
                "total": total
            }
        }
    
    @staticmethod
    def get_user_subscription(
        db: Session,
        user_id: str
    ) -> Optional[Subscription]:
        """
        Получить активную подписку пользователя
        
        Args:
            db: Database session
            user_id: ID пользователя
        
        Returns:
            Subscription или None
        """
        return db.query(Subscription).filter(
            Subscription.user_id == user_id
        ).first()


# Глобальный экземпляр
billing_service = BillingService()

