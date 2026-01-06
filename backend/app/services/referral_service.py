"""
ReferralService - Реферальная система
"""
from sqlalchemy.orm import Session
from typing import Optional, Tuple
import secrets
import logging
from sqlalchemy.exc import IntegrityError

from app.models.user import User
from app.models.referral_config import ReferralConfig
from app.models.credit_transaction import CreditTransaction, CreditTransactionType
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
        # ВАЖНО: проверка existing + commit не защищает от гонок, поэтому
        # дополнительно обрабатываем IntegrityError по UNIQUE constraint.
        max_attempts = 25
        for _ in range(max_attempts):
            code = ReferralService.generate_referral_code()
            user.referral_code = code
            try:
                db.commit()
                db.refresh(user)
                logger.info(f"Assigned referral code {code} to user {user.id}")
                return code
            except IntegrityError:
                db.rollback()
                # Повторяем попытку с новым кодом
                continue
        
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

        # Нельзя менять referrer после установки (anti-fraud + консистентность)
        if new_user.referred_by_id is not None:
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
        plan_id: str,
        payment_id: str
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
        from app.core.config import settings
        if not payment_id:
            return None, "Missing payment_id for referral reward"

        # Преобразуем ID для совместимости с Postgres
        target_payer_id = payer_user_id
        if not settings.USE_SQLITE:
            from uuid import UUID
            try:
                if isinstance(payer_user_id, str):
                    target_payer_id = UUID(payer_user_id)
            except (ValueError, TypeError):
                pass

        # 1. Находим пользователя и проверяем, есть ли referrer
        payer = db.query(User).filter(User.id == target_payer_id).first()
        if not payer or not payer.referred_by_id:
            return None, None  # Нет реферера — ничего не делаем
        
        referrer_id = payer.referred_by_id

        # Доп. anti-fraud: вдруг в базе битая связь
        if str(referrer_id) == str(payer_user_id):
            logger.warning(f"Blocked self-referral reward: payer={payer_user_id}")
            return None, None

        # Idempotency: реф-награда должна начисляться один раз на payment_id
        already_rewarded = db.query(CreditTransaction).filter(
            CreditTransaction.user_id == referrer_id,
            CreditTransaction.type == CreditTransactionType.REFERRAL_REWARD.value,
            CreditTransaction.related_entity_id == str(payment_id),
        ).first()
        if already_rewarded:
            logger.info(f"Referral reward already processed for payment {payment_id}")
            return None, None
        
        # 2. Проверяем конфиг награды для этого тарифа
        config = db.query(ReferralConfig).filter(
            ReferralConfig.tariff_plan_id == plan_id
        ).first()
        
        if not config:
            # Пытаемся создать дефолтный конфиг, если его нет
            config = ReferralService.get_or_create_config(db, plan_id)

        if not config.is_active or config.reward_credits <= 0:
            logger.info(f"Referral reward disabled or zero for plan {plan_id} (active={config.is_active}, reward={config.reward_credits})")
            return None, None
        
        # 3. Начисляем награду пригласившему
        new_balance, error = credit_service.add_credits(
            db=db,
            user_id=str(referrer_id),
            amount=config.reward_credits,
            transaction_type=CreditTransactionType.REFERRAL_REWARD.value,
            related_entity_id=str(payment_id),
            description=f"Referral reward: payer={payer_user_id}, plan={plan_id}, payment={payment_id}",
            commit=False  # Commit делает вызывающий код
        )
        
        if error:
            if error == "duplicate_transaction":
                # Уже начисляли — идемпотентный no-op
                return None, None
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
        from app.core.config import settings
        
        # Преобразуем user_id в правильный тип (UUID или String)
        # В зависимости от типа БД
        if settings.USE_SQLITE:
            # Для SQLite user_id уже строка
            user_id_filter = user_id
        else:
            # Для PostgreSQL нужно преобразовать строку в UUID
            from uuid import UUID
            try:
                user_id_filter = UUID(user_id) if isinstance(user_id, str) else user_id
            except (ValueError, AttributeError):
                # Если не удалось преобразовать, используем как есть
                user_id_filter = user_id
        
        # Количество приглашённых
        invited_count = db.query(User).filter(User.referred_by_id == user_id_filter).count()
        
        # Сколько кредитов заработано на рефералах
        total_earned = db.query(func.coalesce(func.sum(CreditTransaction.amount), 0)).filter(
            CreditTransaction.user_id == user_id_filter,
            CreditTransaction.type == CreditTransactionType.REFERRAL_REWARD.value
        ).scalar()
        
        # Получаем реферальный код
        user = db.query(User).filter(User.id == user_id_filter).first()
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

