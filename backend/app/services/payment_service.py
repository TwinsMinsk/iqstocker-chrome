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
    def verify_tribute_signature(request_body: bytes, signature: str, secret: str | None) -> bool:
        """
        Проверить HMAC-SHA256 подпись от Tribute
        
        Args:
            request_body: Тело запроса (bytes)
            signature: Подпись из заголовка trbt-signature
        
        Returns:
            True если подпись валидна, False иначе
        """
        if not secret:
            # В production это критично: не допускаем fail-open.
            if settings.ENVIRONMENT == "production":
                logger.error("TRIBUTE_WEBHOOK_SECRET is missing in production; rejecting webhook")
                return False
            # В dev/test допускаем fail-open, чтобы не блокировать локальную разработку.
            logger.warning("TRIBUTE_WEBHOOK_SECRET not configured, skipping signature verification (non-production)")
            return True

        if not signature:
            logger.warning("Missing trbt-signature header")
            return False
        
        # ВАЖНО: Убеждаемся, что request_body это bytes
        if isinstance(request_body, str):
            request_body = request_body.encode('utf-8')
        
        computed = hmac.new(
            secret.encode(),
            request_body,
            hashlib.sha256
        ).hexdigest()
        
        is_valid = hmac.compare_digest(computed, signature)
        
        if not is_valid:
            logger.warning(
                f"Signature mismatch. Expected: {computed[:16]}..., Got: {signature[:16]}... "
                f"Body length: {len(request_body)}, Secret configured: {bool(settings.TRIBUTE_WEBHOOK_SECRET)}"
            )
        
        return is_valid
    
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
        # 1. Проверить подпись (секрет берем из ENV, иначе из БД админ-настройки)
        secret = settings.TRIBUTE_API_KEY
        
        # Если ключа нет в ENV (локальная разработка без ключа), пробуем старый способ или пропускаем
        if not secret:
             # Fallback для совместимости или тестов
             from app.services.app_settings_service import app_settings_service
             secret = settings.TRIBUTE_WEBHOOK_SECRET or app_settings_service.get_tribute_webhook_secret_plaintext(db)

        if not PaymentService.verify_tribute_signature(request_body, signature, secret):
            logger.error("Invalid Tribute webhook signature")
            return {
                "status": "error",
                "message": "Invalid signature",
                "error_code": "invalid_signature",
            }
        
        event_name = webhook_data.get("name")
        payload = webhook_data.get("payload", {})
        
        # 2. Обработать событие
        if event_name in ["new_subscription", "new_digital_product", "payment_received", "donation", "digital_product_purchased", "shop_order"]:
            return await PaymentService._handle_payment(db, payload, event_name)
        elif event_name == "cancelled_subscription":
            return await PaymentService._handle_cancelled_subscription(db, payload)
        else:
            logger.warning(f"Unknown webhook event: {event_name}")
            return {
                "status": "ignored",
                "message": f"Unknown event: {event_name}"
            }
    
    @staticmethod
    async def _handle_payment(
        db: Session,
        payload: Dict,
        event_name: str
    ) -> Dict:
        """
        Обработать платеж от Tribute (любого типа)
        
        Args:
            db: Database session
            payload: Данные платежа
            event_name: Тип события
        
        Returns:
            Dict с результатом
        """
        # В разных событиях ID может называться по-разному
        # period_id - для подписок (subscriptions)
        # payment_id/id - для общих платежей
        # product_id - для цифровых товаров (Digital Products)
        # order_id - для физических заказов (Physical Orders)
        raw_payment_id = (
            payload.get("period_id") or 
            payload.get("payment_id") or 
            payload.get("product_id") or 
            payload.get("order_id") or 
            payload.get("id")
        )
        if not raw_payment_id:
            logger.error("Webhook payload missing payment identifier (period_id/payment_id/product_id/order_id/id)")
            return {"status": "error", "message": "Missing payment id"}

        payment_id = str(raw_payment_id)
        amount = payload.get("amount", 0) / 100  # Tribute передает в центах
        currency = payload.get("currency", "eur").upper()
        telegram_user_id = payload.get("telegram_user_id")
        
        # Название продукта/подписки
        product_name = payload.get("subscription_name") or payload.get("product_name") or payload.get("description", "")
        
        # === ПАРСИНГ ПАРАМЕТРОВ (USER_ID) ИЗ PAYLOAD ===
        # Мы передаем в create_payment payload="user_id=...&plan_id=..."
        # Tribute возвращает эту строку в поле "payload"
        
        raw_payload_str = payload.get("payload")
        parsed_params = {}
        
        if raw_payload_str and isinstance(raw_payload_str, str):
            try:
                from urllib.parse import parse_qs
                # parse_qs возвращает {'key': ['val']}, берем [0]
                parsed = parse_qs(raw_payload_str)
                for k, v in parsed.items():
                    if v:
                        parsed_params[k] = v[0]
            except Exception as e:
                logger.warning(f"Failed to parse payload string '{raw_payload_str}': {e}")

        # Приоритет 1: user_id из распарсенного payload (наш динамический инвойс)
        user_id = parsed_params.get("user_id")
        plan_id_from_payload = parsed_params.get("plan_id")
        
        # Приоритет 2: custom_data или comment (legacy/fallback)
        if not user_id:
            custom_data = payload.get("custom_data") or {}
            user_id = (custom_data.get("user_id") if isinstance(custom_data, dict) else None) or payload.get("comment")
        
        # Проверить на дублирование (idempotency)
        existing_transaction = db.query(Transaction).filter(
            Transaction.payment_id == payment_id
        ).first()
        
        # ВАЖНО: если транзакция уже completed, это не значит, что мы безопасно начислили
        # все побочные эффекты (например, реферальную награду). Поэтому делаем
        # "reconciliation" (идемпотентно) по credit_transactions.
        if existing_transaction and existing_transaction.status == "completed":
            if not existing_transaction.user_id:
                logger.warning(f"Completed transaction {payment_id} has no user_id; cannot reconcile credits")
                return {"status": "already_processed", "message": "Transaction already processed"}

            from app.models.credit_transaction import CreditTransaction, CreditTransactionType
            from app.services.credit_service import credit_service
            from app.services.referral_service import referral_service

            # 1) Purchase credits idempotency (must exist exactly once)
            purchase_exists = db.query(CreditTransaction).filter(
                CreditTransaction.user_id == existing_transaction.user_id,
                CreditTransaction.type == CreditTransactionType.PURCHASE.value,
                CreditTransaction.related_entity_id == payment_id,
            ).first()

            if not purchase_exists:
                logger.warning(f"Reconciling missing purchase credit tx for payment {payment_id}")
                _, credit_error = credit_service.add_credits(
                    db=db,
                    user_id=str(existing_transaction.user_id),
                    amount=int(existing_transaction.credits),
                    transaction_type=CreditTransactionType.PURCHASE.value,
                    related_entity_id=payment_id,
                    description=f"Purchase (replay): {existing_transaction.plan_id or ''}",
                    commit=False,
                )
                if credit_error and credit_error != "duplicate_transaction":
                    db.rollback()
                    return {"status": "error", "message": f"Failed to reconcile credits: {credit_error}"}

            # 2) Referral reward idempotency (safe to call multiple times)
            referral_reward, ref_error = referral_service.process_referral_reward(
                db=db,
                payer_user_id=str(existing_transaction.user_id),
                plan_id=str(existing_transaction.plan_id or ""),
                payment_id=payment_id,
            )
            if ref_error:
                db.rollback()
                # Не откатываем payment (он уже processed), но сигнализируем ошибку.
                return {"status": "error", "message": f"Failed to reconcile referral reward: {ref_error}"}

            db.commit()
            logger.info(f"Transaction {payment_id} already processed (reconciled)")
            return {"status": "already_processed", "message": "Transaction already processed"}
        
        # Определить план
        plan_id = None
        
        # 1. Из payload (самый надежный)
        if "plan_id_from_payload" in locals() and plan_id_from_payload:
            plan_id = str(plan_id_from_payload)

        # 2. Из custom_data (fallback)
        if not plan_id and isinstance(custom_data, dict):
            plan_id_candidate = custom_data.get("plan_id")
            if plan_id_candidate:
                plan_id = str(plan_id_candidate)

        # Fallback: план по названию или сумме
        if not plan_id:
            plan_id = PaymentService._get_plan_id_from_name(product_name)
        
        # Если не нашли по названию, попробуем по сумме (как запасной вариант)
        if not plan_id:
            plan_id = PaymentService._get_plan_id_from_amount(amount)

        if not plan_id:
            logger.error(f"Unknown product: {product_name}, amount: {amount}")
            return {
                "status": "error",
                "message": f"Unknown product: {product_name}"
            }
        
        from app.services.billing_service import billing_service
        plan = billing_service.get_plan(plan_id)
        
        # Поиск пользователя
        target_user = None
        from app.models.user import User
        
        # 1. Сначала по user_id из custom_data/comment
        if user_id:
            target_user = db.query(User).filter(User.id == user_id).first()
        
        # 2. Если не нашли, по telegram_user_id
        if not target_user and telegram_user_id:
            target_user = db.query(User).filter(User.telegram_user_id == str(telegram_user_id)).first()
        
        # 3. Как запасной вариант - по email (если Tribute его передает в payload)
        if not target_user and payload.get("email"):
            target_user = db.query(User).filter(User.email == payload.get("email")).first()

        if not target_user:
            # Не создаём Transaction с user_id=None (в модели NOT NULL).
            logger.error(
                f"User not resolved for payment {payment_id}. "
                f"user_id={user_id}, telegram_user_id={telegram_user_id}, email={payload.get('email')}"
            )
            return {"status": "error", "message": "User not found for payment"}

        # Создать или обновить транзакцию
        if existing_transaction:
            transaction = existing_transaction
            transaction.user_id = target_user.id
        else:
            transaction = Transaction(
                payment_id=payment_id,
                amount=amount,
                credits=plan["credits"],
                type="purchase",
                status="pending",
                plan_id=plan_id,
                user_id=target_user.id
            )
            db.add(transaction)
        
        # Обновить статус
        transaction.status = "completed"
        transaction.completed_at = datetime.utcnow()
        
        # Если нашли пользователя, обновляем его баланс
        subscription = db.query(Subscription).filter(
            Subscription.user_id == transaction.user_id
        ).first()

        if not subscription:
            # Создаем запись о балансе, если её нет
            subscription = Subscription(
                user_id=transaction.user_id,
                plan_id=plan_id,
                credits_balance=0,
                status="active"
            )
            db.add(subscription)
            db.flush()  # Нужно flush, чтобы credit_service мог найти subscription

        # Начислить кредиты через credit_service для атомарности и аудита (идемпотентно через БД индекс)
        from app.services.credit_service import credit_service
        from app.models.credit_transaction import CreditTransactionType

        _, credit_error = credit_service.add_credits(
            db=db,
            user_id=str(transaction.user_id),
            amount=plan["credits"],
            transaction_type=CreditTransactionType.PURCHASE.value,
            related_entity_id=payment_id,
            description=f"Purchase: {plan['name']}",
            commit=False  # Commit делаем позже
        )

        if credit_error and credit_error != "duplicate_transaction":
            logger.error(f"Failed to add credits: {credit_error}")
            db.rollback()
            return {
                "status": "error",
                "message": f"Failed to add credits: {credit_error}"
            }

        # Обновляем другие поля подписки (credit_service уже обновил баланс)
        subscription.plan_id = plan_id  # Обновляем "текущий" пакет
        subscription.status = "active"

        # Срок действия (для кредитов обычно 1 год или бессрочно)
        subscription.subscription_expires_at = datetime.utcnow() + timedelta(days=plan.get("duration_days", 365))

        # === REFERRAL REWARD HOOK ===
        # После успешного начисления кредитов — проверяем реферальную награду (идемпотентно)
        from app.services.referral_service import referral_service

        referral_reward, ref_error = referral_service.process_referral_reward(
            db=db,
            payer_user_id=str(transaction.user_id),
            plan_id=plan_id,
            payment_id=payment_id,
        )

        if ref_error:
            logger.error(f"Failed to add referral reward: {ref_error}")
            db.rollback()
            return {"status": "error", "message": f"Failed referral reward: {ref_error}"}

        if referral_reward:
            logger.info(f"Referral reward {referral_reward} credits paid for payment {payment_id}")
        # === END REFERRAL HOOK ===
                
            # Отправить email уведомление
            if email_service:
                user = db.query(User).filter(User.id == transaction.user_id).first()
                if user:
                    try:
                        email_service.send_email(
                            to_email=user.email,
                            subject="Кредиты успешно начислены - Midjourney Auto",
                            html_content=f"""
                            <html>
                            <body>
                                <h2>Пополнение баланса успешно!</h2>
                                <p>Вы приобрели: <strong>{plan['name']}</strong></p>
                                <p>Начислено кредитов: <strong>{plan['credits']}</strong></p>
                                <p>Текущий баланс: <strong>{subscription.credits_balance}</strong></p>
                                <p>Спасибо за покупку!</p>
                            </body>
                            </html>
                            """
                        )
                    except Exception as e:
                        logger.warning(f"Failed to send payment confirmation email: {e}")
        
        db.commit()
        
        logger.info(f"Processed payment: id={payment_id}, plan={plan_id}, user={transaction.user_id}")
        
        return {
            "status": "ok",
            "message": "Payment processed successfully",
            "credits_added": plan["credits"]
        }
    
    @staticmethod
    def _get_plan_id_from_amount(amount: float) -> Optional[str]:
        """Определить plan_id по сумме платежа (запасной вариант)"""
        from app.services.billing_service import PLANS
        for pid, plan in PLANS.items():
            if abs(float(plan["price_eur"]) - float(amount)) < 0.01:
                return pid
        return None

    @staticmethod
    def _get_plan_id_from_name(name: str) -> Optional[str]:
        """Определить plan_id по названию подписки или продукта"""
        if not name:
            return None
        name_lower = name.lower()
        
        # Проверяем новые планы (приоритет для больших сумм)
        if "10000" in name_lower or "10000" in name:
            return "credit_10000"
        elif "5000" in name_lower or "5000" in name:
            return "credit_5000"
        elif "2500" in name_lower or "2500" in name:
            return "credit_2500"
        elif "500" in name_lower and "2500" not in name_lower and "5000" not in name_lower and "10000" not in name_lower:
            return "credit_500"
        
        # Совместимость со старыми планами (для обратной совместимости)
        if "1000" in name_lower:
            return "credit_2500"  # Маппинг старого плана на новый
        elif "2000" in name_lower:
            return "credit_5000"  # Маппинг старого плана на новый
        
        # Совместимость со старыми названиями
        if "basic" in name_lower:
            return "credit_2500"
        elif "standard" in name_lower:
            return "credit_5000"
        elif "pro" in name_lower:
            return "credit_10000"
            
        return None
    
    @staticmethod
    async def _handle_cancelled_subscription(
        db: Session,
        payload: Dict
    ) -> Dict:
        """
        Обработать отмену подписки от Tribute
        
        Args:
            db: Database session
            payload: Данные события отмены подписки
        
        Returns:
            Dict с результатом обработки
        """
        # Получаем идентификаторы из payload
        telegram_user_id = payload.get("telegram_user_id")
        period_id = payload.get("period_id") or payload.get("payment_id")
        
        # Поиск пользователя
        target_user = None
        from app.models.user import User
        
        # 1. По telegram_user_id
        if telegram_user_id:
            target_user = db.query(User).filter(
                User.telegram_user_id == str(telegram_user_id)
            ).first()
        
        # 2. По email (если передан)
        if not target_user and payload.get("email"):
            target_user = db.query(User).filter(
                User.email == payload.get("email")
            ).first()
        
        if not target_user:
            logger.warning(f"User not found for cancelled subscription: {payload}")
            return {
                "status": "error",
                "message": "User not found"
            }
        
        # Найти активную подписку пользователя
        subscription = db.query(Subscription).filter(
            Subscription.user_id == target_user.id,
            Subscription.status == "active"
        ).first()
        
        if subscription:
            # Помечаем подписку как отмененную
            subscription.status = "cancelled"
            subscription.subscription_expires_at = datetime.utcnow()
            
            # Найти связанную транзакцию (если есть)
            if period_id:
                transaction = db.query(Transaction).filter(
                    Transaction.payment_id == str(period_id),
                    Transaction.user_id == target_user.id
                ).first()
                
                if transaction:
                    transaction.status = "cancelled"
            
            db.commit()
            
            logger.info(f"Cancelled subscription for user {target_user.id}")
            
            # Отправить email уведомление
            if email_service:
                try:
                    email_service.send_email(
                        to_email=target_user.email,
                        subject="Подписка отменена - Midjourney Auto",
                        html_content="""
                        <html>
                        <body>
                            <h2>Подписка отменена</h2>
                            <p>Ваша подписка была отменена.</p>
                            <p>Оставшиеся кредиты будут доступны до истечения срока действия подписки.</p>
                            <p>Спасибо за использование нашего сервиса!</p>
                        </body>
                        </html>
                        """
                    )
                except Exception as e:
                    logger.warning(f"Failed to send cancellation email: {e}")
            
            return {
                "status": "ok",
                "message": "Subscription cancelled successfully"
            }
        else:
            logger.warning(f"No active subscription found for user {target_user.id}")
            return {
                "status": "ignored",
                "message": "No active subscription found"
            }


# Глобальный экземпляр
payment_service = PaymentService()

