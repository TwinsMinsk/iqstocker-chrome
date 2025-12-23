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

logger = logging.getLogger(__name__)


# Константы планов
PLANS = {
    "plan_free": {
        "id": "plan_free",
        "name": "FREE",
        "price_eur": Decimal("0.00"),
        "credits": 50,
        "duration_days": None,
        "description": "Бесплатный тестовый тариф"
    },
    "plan_basic": {
        "id": "plan_basic",
        "name": "BASIC",
        "price_eur": Decimal("3.00"),
        "credits": 1000,
        "price_per_credit": Decimal("0.003"),
        "duration_days": 30,
        "description": "Подходит для начинающих"
    },
    "plan_standard": {
        "id": "plan_standard",
        "name": "STANDARD",
        "price_eur": Decimal("10.00"),
        "credits": 5000,
        "price_per_credit": Decimal("0.002"),
        "duration_days": 30,
        "discount_percent": 33,
        "description": "Самый популярный тариф"
    },
    "plan_pro": {
        "id": "plan_pro",
        "name": "PRO",
        "price_eur": Decimal("17.00"),
        "credits": 10000,
        "price_per_credit": Decimal("0.0017"),
        "duration_days": 30,
        "discount_percent": 50,
        "description": "Для профессионалов"
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
        if not settings.TRIBUTE_API_KEY:
            logger.warning("TRIBUTE_API_KEY not configured, skipping payment creation")
            return {
                "payment_id": str(transaction.id),
                "payment_url": f"https://tribute.to/payment/{transaction.id}",
                "plan": plan["name"],
                "amount": plan["price_eur"],
                "currency": "EUR",
                "expires_at": datetime.utcnow() + timedelta(hours=1)
            }
        
        try:
            # TODO: Интеграция с Tribute API
            # Сейчас возвращаем mock данные
            payment_url = f"https://tribute.to/yourdomain/pay_{transaction.id}"
            
            transaction.payment_id = f"tribute_{transaction.id}"
            db.commit()
            
            return {
                "payment_id": str(transaction.id),
                "payment_url": payment_url,
                "plan": plan["name"],
                "amount": plan["price_eur"],
                "currency": "EUR",
                "expires_at": datetime.utcnow() + timedelta(hours=1)
            }
            
        except Exception as e:
            logger.error(f"Error creating Tribute payment: {e}")
            db.rollback()
            raise
    
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

