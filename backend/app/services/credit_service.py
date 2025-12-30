"""
CreditService - Единая точка для всех операций с кредитами.
Обеспечивает атомарность и аудит через CreditTransaction.
"""
from sqlalchemy.orm import Session
from sqlalchemy import update
from typing import Optional, Tuple
import logging
from sqlalchemy.exc import IntegrityError

from app.models.subscription import Subscription
from app.models.credit_transaction import CreditTransaction
from app.core.config import settings

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
            
            # 2. Обновление баланса
            # PostgreSQL: делаем атомарно через UPDATE ... SET credits_balance = credits_balance + amount.
            # SQLite: упрощаем (в dev/test конкуренция не критична, а RETURNING может быть недоступен).
            if settings.USE_SQLITE:
                subscription.credits_balance = int(subscription.credits_balance or 0) + int(amount)
                db.flush()
                new_balance = int(subscription.credits_balance or 0)
            else:
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

        except IntegrityError as e:
            # Чаще всего это idempotency (уникальный индекс на user_id/type/related_entity_id)
            # — в таком случае caller должен решить, что делать (например, "уже обработано").
            db.rollback()
            logger.warning(f"IntegrityError in add_credits (likely duplicate): {e}")
            return None, "duplicate_transaction"

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

