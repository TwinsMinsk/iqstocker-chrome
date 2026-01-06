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
            logger.error("Tribute API Key (secret) is missing for signature verification")
            return False

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
                f"Body length: {len(request_body)}"
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
        # 1. Проверить подпись (используем TRIBUTE_API_KEY как секрет)
        # Согласно документации Tribute, для подписи используется API Key.
        secret = settings.TRIBUTE_API_KEY
        
        # Если ключа нет в ENV
        if not secret:
            # Fallback для совместимости
            from app.services.app_settings_service import app_settings_service
            secret = settings.TRIBUTE_WEBHOOK_SECRET or app_settings_service.get_tribute_webhook_secret_plaintext(db)
            
            if not secret:
                logger.error("TRIBUTE_API_KEY is not configured")

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
        # shop_order - приоритетное событие для статичных ссылок оплаты
        if event_name == "shop_order":
            return await PaymentService._handle_shop_order(db, payload)
        elif event_name in ["new_subscription", "new_digital_product", "payment_received", "donation", "digital_product_purchased"]:
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
    async def _handle_shop_order(
        db: Session,
        payload: Dict
    ) -> Dict:
        """
        Обработать webhook shop_order от Tribute (для статичных ссылок оплаты)
        
        Структура payload:
        {
            "uuid": "550e8400-e29b-41d4-a716-446655440000",
            "amount": 100000,  # в центах
            "currency": "rub",
            "fee": 8000,
            "status": "paid",
            "email": "user@example.com"
        }
        
        Args:
            db: Database session
            payload: Данные платежа из shop_order webhook
        
        Returns:
            Dict с результатом
        """
        # Проверяем статус платежа
        payment_status = payload.get("status")
        if payment_status != "paid":
            logger.info(f"Shop order status is '{payment_status}', skipping processing")
            return {
                "status": "ignored",
                "message": f"Order status is not 'paid': {payment_status}"
            }
        
        # Получаем данные платежа
        payment_uuid = payload.get("uuid")
        if not payment_uuid:
            logger.error("Shop order webhook missing uuid")
            return {"status": "error", "message": "Missing payment uuid"}
        
        # Сумма в центах, конвертируем в евро/рубли
        amount_cents = payload.get("amount", 0)
        amount = amount_cents / 100  # Конвертируем из центов
        currency = payload.get("currency", "eur").lower()
        
        # EMAIL - основной способ определения пользователя для статичных ссылок
        user_email = payload.get("email")
        if not user_email:
            logger.error(f"Shop order webhook missing email for payment {payment_uuid}")
            return {"status": "error", "message": "Missing email in payment data"}
        
        logger.info(f"Processing shop_order: uuid={payment_uuid}, amount={amount} {currency}, email={user_email}")
        
        # === ПОИСК ПОЛЬЗОВАТЕЛЯ ПО EMAIL ===
        target_user = db.query(User).filter(User.email == user_email).first()
        
        if not target_user:
            logger.error(
                f"User not found for shop_order payment {payment_uuid}. "
                f"email={user_email}. User must register first."
            )
            return {
                "status": "error",
                "message": f"User with email {user_email} not found. Please register first."
            }
        
        logger.info(f"Found user by email: {target_user.id} ({user_email})")
        
        # === ОПРЕДЕЛЕНИЕ PLAN_ID ПО СУММЕ ПЛАТЕЖА ===
        # Для статичных ссылок мы определяем план по сумме, так как в shop_order нет названия продукта
        plan_id = PaymentService._get_plan_id_from_amount(amount)
        
        if not plan_id:
            logger.error(
                f"Cannot determine plan_id for shop_order payment {payment_uuid}. "
                f"amount={amount} {currency}. Available plans: {list(PLANS.keys())}"
            )
            return {
                "status": "error",
                "message": f"Cannot determine plan: amount={amount} {currency}"
            }
        
        # Получаем план для дальнейшей обработки
        from app.services.billing_service import billing_service
        plan = billing_service.get_plan(plan_id)
        if not plan:
            logger.error(f"Plan {plan_id} not found in PLANS")
            return {"status": "error", "message": f"Plan {plan_id} not found"}
        
        # Проверяем, что сумма совпадает (допускаем небольшую погрешность из-за конвертации валют)
        # ВАЖНО: Для статичных ссылок суммы должны совпадать, так как каждая ссылка привязана к конкретному плану
        # Если пользователь платит в другой валюте, Tribute конвертирует сумму, но мы сравниваем с ценой плана в EUR
        expected_amount = float(plan["price_eur"])
        amount_diff = abs(expected_amount - amount)
        
        # Для разных валют допускаем большую погрешность (конвертация валют может давать небольшие расхождения)
        if currency != "eur":
            tolerance = 0.5  # 50 центов разницы допустимо при конвертации валют
        else:
            tolerance = 0.01  # 1 цент разницы допустимо для EUR
        
        if amount_diff > tolerance:
            logger.warning(
                f"Amount mismatch for shop_order payment {payment_uuid}. "
                f"Expected: {expected_amount} EUR, Got: {amount} {currency}, plan_id: {plan_id}, diff: {amount_diff}. "
                f"This may indicate incorrect payment link configuration in admin panel."
            )
            # Не блокируем обработку, но логируем предупреждение для админа
        
        # === ПРОВЕРКА НА ДУБЛИКАТЫ ===
        # Проверяем, не обработан ли уже этот платеж
        existing_transaction = db.query(Transaction).filter(
            Transaction.payment_id == str(payment_uuid)
        ).first()
        
        if existing_transaction and existing_transaction.status == "completed":
            # Проверяем, что кредиты уже начислены
            from app.models.credit_transaction import CreditTransaction, CreditTransactionType
            purchase_exists = db.query(CreditTransaction).filter(
                CreditTransaction.user_id == target_user.id,
                CreditTransaction.type == CreditTransactionType.PURCHASE.value,
                CreditTransaction.related_entity_id == str(payment_uuid),
            ).first()
            
            if purchase_exists:
                logger.info(f"Shop order {payment_uuid} already processed (idempotency check passed)")
                return {"status": "already_processed", "message": "Transaction already processed"}
            else:
                logger.warning(f"Transaction {payment_uuid} marked as completed but credits not found - will reconcile")
        
        # === СОЗДАНИЕ ИЛИ ОБНОВЛЕНИЕ ТРАНЗАКЦИИ ===
        if existing_transaction:
            # Обновляем существующую транзакцию
            existing_transaction.user_id = target_user.id
            existing_transaction.plan_id = plan_id
            existing_transaction.amount = amount
            existing_transaction.credits = plan["credits"]
            transaction = existing_transaction
        else:
            # Создаем новую транзакцию
            transaction = Transaction(
                payment_id=str(payment_uuid),
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
        
        # === НАЧИСЛЕНИЕ КРЕДИТОВ ===
        # Получаем или создаем подписку
        subscription = db.query(Subscription).filter(
            Subscription.user_id == target_user.id
        ).first()

        if not subscription:
            # Создаем запись о балансе, если её нет
            subscription = Subscription(
                user_id=target_user.id,
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
            user_id=str(target_user.id),
            amount=plan["credits"],
            transaction_type=CreditTransactionType.PURCHASE.value,
            related_entity_id=str(payment_uuid),
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
            payer_user_id=str(target_user.id),
            plan_id=plan_id,
            payment_id=str(payment_uuid),
        )

        if ref_error:
            logger.error(f"Failed to add referral reward: {ref_error}")
            db.rollback()
            return {"status": "error", "message": f"Failed referral reward: {ref_error}"}

        if referral_reward:
            logger.info(f"Referral reward {referral_reward} credits paid for payment {payment_uuid}")
        # === END REFERRAL HOOK ===
        
        db.commit()
        
        logger.info(f"Processed shop_order payment: uuid={payment_uuid}, plan={plan_id}, user={target_user.id}")
        
        return {
            "status": "ok",
            "message": "Payment processed successfully",
            "credits_added": plan["credits"]
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
        # order_id/uuid - для Shop API заказов (Shop Orders)
        raw_payment_id = (
            payload.get("uuid") or  # Shop API использует uuid
            payload.get("period_id") or 
            payload.get("payment_id") or 
            payload.get("product_id") or 
            payload.get("order_id") or 
            payload.get("id")
        )
        if not raw_payment_id:
            logger.error("Webhook payload missing payment identifier (uuid/period_id/payment_id/product_id/order_id/id)")
            return {"status": "error", "message": "Missing payment id"}

        payment_id = str(raw_payment_id)
        amount = payload.get("amount", 0) / 100  # Tribute передает в центах
        currency = payload.get("currency", "eur").lower()
        telegram_user_id = payload.get("telegram_user_id")
        
        # Название продукта/подписки (для Shop API это title)
        product_name = (
            payload.get("title") or  # Shop API использует title
            payload.get("subscription_name") or 
            payload.get("product_name") or 
            payload.get("description") or 
            ""
        )
        
        # === ПОИСК ПОЛЬЗОВАТЕЛЯ И ТРАНЗАКЦИИ ===
        # Для Shop API мы используем поиск по email (который передавали при создании) и uuid транзакции.
        
        logger.info(f"Processing payment webhook: event={event_name}, payment_id={payment_id}, amount={amount}, email={payload.get('email')}")
        
        # 1. Сначала ищем по payment_id (это uuid заказа из Tribute)
        # Мы сохраняли его в Transaction.payment_id при создании
        transaction = db.query(Transaction).filter(
            Transaction.payment_id == payment_id
        ).first()
        
        target_user = None
        plan_id = None
        from app.models.user import User
        
        if transaction and transaction.user_id:
            # Нашли транзакцию -> нашли пользователя
            logger.info(f"Found existing transaction {payment_id} for user {transaction.user_id}")
            target_user = db.query(User).filter(User.id == transaction.user_id).first()
            if target_user:
                # Если транзакция уже есть, plan_id берем из нее
                if transaction.plan_id:
                    plan_id = transaction.plan_id
                    logger.info(f"Using plan_id from transaction: {plan_id}")
                
                # Проверяем на идемпотентность: если транзакция уже completed
                if transaction.status == "completed":
                    # Проверяем, что кредиты уже начислены
                    from app.models.credit_transaction import CreditTransaction, CreditTransactionType
                    purchase_exists = db.query(CreditTransaction).filter(
                        CreditTransaction.user_id == transaction.user_id,
                        CreditTransaction.type == CreditTransactionType.PURCHASE.value,
                        CreditTransaction.related_entity_id == payment_id,
                    ).first()
                    
                    if purchase_exists:
                        logger.info(f"Transaction {payment_id} already processed (idempotency check passed)")
                        return {"status": "already_processed", "message": "Transaction already processed"}
                    else:
                        logger.warning(f"Transaction {payment_id} marked as completed but credits not found - will reconcile")

        # 2. Если транзакции нет или user не найден - ищем по email из payload вебхука (приоритет для статичных ссылок)
        if not target_user and payload.get("email"):
            logger.info(f"Transaction not found, searching user by email: {payload.get('email')}")
            target_user = db.query(User).filter(User.email == payload.get("email")).first()
            if target_user:
                logger.info(f"Found user by email: {target_user.id}")

        # 3. Fallback: по telegram_user_id (если есть)
        if not target_user and telegram_user_id:
            logger.info(f"User not found by email, searching by telegram_user_id: {telegram_user_id}")
            target_user = db.query(User).filter(User.telegram_user_id == str(telegram_user_id)).first()
            if target_user:
                logger.info(f"Found user by telegram_user_id: {target_user.id}")
        
        # Legacy код для совместимости со старыми методами (Products API)
        if not target_user:
            raw_payload_str = payload.get("payload")
            parsed_params = {}
            if raw_payload_str and isinstance(raw_payload_str, str):
                try:
                    from urllib.parse import parse_qs
                    parsed = parse_qs(raw_payload_str)
                    for k, v in parsed.items():
                        if v:
                            parsed_params[k] = v[0]
                except Exception:
                    pass
            
            uid_param = parsed_params.get("user_id")
            if uid_param:
                target_user = db.query(User).filter(User.id == uid_param).first()

        # Если так и не нашли пользователя
        if not target_user:
            logger.error(
                f"User not resolved for payment {payment_id}. "
                f"email={payload.get('email')}, telegram_user_id={telegram_user_id}, event={event_name}"
            )
            return {"status": "error", "message": "User not found for payment"}

        # === ОПРЕДЕЛЕНИЕ PLAN_ID ===
        # Если plan_id еще не определен (транзакция не найдена), определяем по сумме или названию
        if not plan_id:
            # 1. По названию продукта (title для Shop API)
            plan_id = PaymentService._get_plan_id_from_name(product_name)
            
            # 2. Если не нашли по названию, пробуем по сумме
            if not plan_id:
                plan_id = PaymentService._get_plan_id_from_amount(amount, currency)
            
            if not plan_id:
                logger.error(f"Cannot determine plan_id for payment {payment_id}. product_name={product_name}, amount={amount}")
                return {
                    "status": "error",
                    "message": f"Cannot determine plan: product_name={product_name}, amount={amount}"
                }
        
        # Получаем план для дальнейшей обработки
        from app.services.billing_service import billing_service
        plan = billing_service.get_plan(plan_id)
        if not plan:
            logger.error(f"Plan {plan_id} not found in PLANS")
            return {"status": "error", "message": f"Plan {plan_id} not found"}
        
        # Проверяем, что сумма совпадает (дополнительная валидация)
        if abs(float(plan["price_eur"]) - float(amount)) > 0.01:
            logger.warning(
                f"Amount mismatch for payment {payment_id}. "
                f"Expected: {plan['price_eur']}, Got: {amount}, plan_id: {plan_id}"
            )

        # Создать или обновить транзакцию
        if transaction:
            # Обновляем существующую транзакцию
            transaction.user_id = target_user.id
            transaction.plan_id = plan_id
            transaction.amount = amount
            transaction.credits = plan["credits"]
        else:
            # Создаем новую транзакцию
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
        
        db.commit()
        
        logger.info(f"Processed payment: id={payment_id}, plan={plan_id}, user={transaction.user_id}")
        
        return {
            "status": "ok",
            "message": "Payment processed successfully",
            "credits_added": plan["credits"]
        }
    
    @staticmethod
    def _get_plan_id_from_amount(amount: float, currency: str = "eur") -> Optional[str]:
        """
        Определить plan_id по сумме платежа
        
        Args:
            amount: Сумма платежа (уже конвертированная из центов)
            currency: Валюта платежа (для логирования)
        
        Returns:
            plan_id или None
        """
        from app.services.billing_service import PLANS
        
        # Для разных валют допускаем большую погрешность из-за конвертации
        if currency.lower() != "eur":
            tolerance = 0.5  # 50 центов разницы допустимо при конвертации валют
        else:
            tolerance = 0.01  # 1 цент разницы допустимо для EUR
        
        # Ищем план с наиболее близкой суммой
        best_match = None
        min_diff = float('inf')
        
        for pid, plan in PLANS.items():
            expected_amount = float(plan["price_eur"])
            diff = abs(expected_amount - amount)
            
            if diff < tolerance and diff < min_diff:
                min_diff = diff
                best_match = pid
        
        if best_match:
            logger.info(f"Matched plan {best_match} for amount {amount} {currency} (expected: {PLANS[best_match]['price_eur']} EUR, diff: {min_diff})")
        
        return best_match

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

