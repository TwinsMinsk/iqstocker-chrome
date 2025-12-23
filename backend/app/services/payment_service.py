"""
Сервис для обработки платежей через Tribute webhook
"""
from sqlalchemy.orm import Session
from typing import Dict, Optional
from datetime import datetime, timedelta
import hmac
import hashlib
import logging

from app.models.transaction import Transaction
from app.models.subscription import Subscription
from app.models.user import User
from app.core.config import settings
from app.utils.email_service import email_service

logger = logging.getLogger(__name__)


class PaymentService:
    """Сервис для обработки платежей"""
    
    @staticmethod
    def verify_tribute_signature(request_body: bytes, signature: str) -> bool:
        """
        Проверить HMAC-SHA256 подпись от Tribute
        
        Args:
            request_body: Тело запроса (bytes)
            signature: Подпись из заголовка trbt-signature
        
        Returns:
            True если подпись валидна, False иначе
        """
        if not settings.TRIBUTE_WEBHOOK_SECRET:
            logger.warning("TRIBUTE_WEBHOOK_SECRET not configured, skipping signature verification")
            return True  # В development режиме пропускаем проверку
        
        computed = hmac.new(
            settings.TRIBUTE_WEBHOOK_SECRET.encode(),
            request_body,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(computed, signature)
    
    @staticmethod
    async def process_tribute_webhook(
        db: Session,
        webhook_data: Dict,
        request_body: bytes,
        signature: str
    ) -> Dict:
        """
        Обработать webhook от Tribute
        
        Args:
            db: Database session
            webhook_data: Данные webhook (уже распарсенные JSON)
            request_body: Исходное тело запроса для проверки подписи
            signature: Подпись из заголовка
        
        Returns:
            Dict с результатом обработки
        """
        # 1. Проверить подпись
        if not PaymentService.verify_tribute_signature(request_body, signature):
            logger.error("Invalid Tribute webhook signature")
            return {
                "status": "error",
                "message": "Invalid signature"
            }
        
        event_name = webhook_data.get("name")
        payload = webhook_data.get("payload", {})
        
        # 2. Обработать событие
        if event_name == "new_subscription":
            return await PaymentService._handle_new_subscription(db, payload)
        elif event_name == "cancelled_subscription":
            return await PaymentService._handle_cancelled_subscription(db, payload)
        else:
            logger.warning(f"Unknown webhook event: {event_name}")
            return {
                "status": "ignored",
                "message": f"Unknown event: {event_name}"
            }
    
    @staticmethod
    async def _handle_new_subscription(
        db: Session,
        payload: Dict
    ) -> Dict:
        """
        Обработать новую подписку от Tribute
        
        Args:
            db: Database session
            payload: Данные подписки
        
        Returns:
            Dict с результатом
        """
        period_id = str(payload.get("period_id"))
        amount = payload.get("amount", 0) / 100  # Tribute передает в центах
        currency = payload.get("currency", "eur").upper()
        telegram_user_id = payload.get("telegram_user_id")
        subscription_name = payload.get("subscription_name", "")
        expires_at_str = payload.get("expires_at")
        
        # Проверить на дублирование (idempotency)
        existing_transaction = db.query(Transaction).filter(
            Transaction.payment_id == period_id
        ).first()
        
        if existing_transaction and existing_transaction.status == "completed":
            logger.info(f"Transaction {period_id} already processed")
            return {
                "status": "already_processed",
                "message": "Transaction already processed"
            }
        
        # Найти пользователя по telegram_user_id или создать транзакцию без пользователя
        # TODO: Реализовать связь telegram_user_id с user_id
        # Пока используем payment_id для связи
        
        # Определить план по названию
        plan_id = PaymentService._get_plan_id_from_name(subscription_name)
        if not plan_id:
            logger.error(f"Unknown subscription name: {subscription_name}")
            return {
                "status": "error",
                "message": f"Unknown subscription: {subscription_name}"
            }
        
        from app.services.billing_service import billing_service
        plan = billing_service.get_plan(plan_id)
        
        # Создать или обновить транзакцию
        if existing_transaction:
            transaction = existing_transaction
        else:
            # TODO: Найти пользователя по telegram_user_id
            # Пока создаем транзакцию без user_id (нужно будет связать позже)
            transaction = Transaction(
                payment_id=period_id,
                amount=amount,
                credits=plan["credits"],
                type="purchase",
                status="pending",
                plan_id=plan_id
            )
            db.add(transaction)
        
        # Обновить статус
        transaction.status = "completed"
        transaction.completed_at = datetime.utcnow()
        
        # Если есть user_id, обновить подписку
        if transaction.user_id:
            subscription = db.query(Subscription).filter(
                Subscription.user_id == transaction.user_id
            ).first()
            
            if subscription:
                # Начислить кредиты
                subscription.credits_balance += plan["credits"]
                
                # Обновить план если нужно
                if plan_id != "plan_free":
                    subscription.plan_id = plan_id
                    subscription.status = "active"
                    
                    if expires_at_str:
                        try:
                            subscription.subscription_expires_at = datetime.fromisoformat(
                                expires_at_str.replace("Z", "+00:00")
                            )
                        except:
                            # Если не удалось распарсить, устанавливаем 30 дней
                            subscription.subscription_expires_at = datetime.utcnow() + timedelta(days=30)
                
                # Отправить email уведомление
                if email_service:
                    user = db.query(User).filter(User.id == transaction.user_id).first()
                    if user:
                        try:
                            email_service.send_email(
                                to_email=user.email,
                                subject="Платеж успешно обработан - Midjourney Auto",
                                html_content=f"""
                                <html>
                                <body>
                                    <h2>Платеж успешно обработан!</h2>
                                    <p>Ваш план <strong>{plan['name']}</strong> активирован.</p>
                                    <p>Начислено кредитов: <strong>{plan['credits']}</strong></p>
                                    <p>Текущий баланс: <strong>{subscription.credits_balance}</strong></p>
                                </body>
                                </html>
                                """
                            )
                        except Exception as e:
                            logger.warning(f"Failed to send payment confirmation email: {e}")
        
        db.commit()
        
        logger.info(f"Processed new subscription: period_id={period_id}, plan={plan_id}")
        
        return {
            "status": "ok",
            "message": "Subscription processed successfully"
        }
    
    @staticmethod
    async def _handle_cancelled_subscription(
        db: Session,
        payload: Dict
    ) -> Dict:
        """
        Обработать отмену подписки от Tribute
        
        Args:
            db: Database session
            payload: Данные отмены
        
        Returns:
            Dict с результатом
        """
        period_id = str(payload.get("period_id"))
        
        # Найти транзакцию
        transaction = db.query(Transaction).filter(
            Transaction.payment_id == period_id
        ).first()
        
        if not transaction:
            logger.warning(f"Transaction not found for cancelled subscription: {period_id}")
            return {
                "status": "ignored",
                "message": "Transaction not found"
            }
        
        # Обновить статус подписки пользователя
        if transaction.user_id:
            subscription = db.query(Subscription).filter(
                Subscription.user_id == transaction.user_id
            ).first()
            
            if subscription:
                subscription.status = "cancelled"
                db.commit()
        
        logger.info(f"Processed cancelled subscription: period_id={period_id}")
        
        return {
            "status": "ok",
            "message": "Cancellation processed"
        }
    
    @staticmethod
    def _get_plan_id_from_name(subscription_name: str) -> Optional[str]:
        """Определить plan_id по названию подписки"""
        name_lower = subscription_name.lower()
        
        if "basic" in name_lower:
            return "plan_basic"
        elif "standard" in name_lower:
            return "plan_standard"
        elif "pro" in name_lower:
            return "plan_pro"
        else:
            return None


# Глобальный экземпляр
payment_service = PaymentService()

