"""
Сервис для работы с пользователями
"""
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional, Tuple
from datetime import datetime
from decimal import Decimal
import logging

from app.models.user import User
from app.models.subscription import Subscription
from app.models.license_key import LicenseKey
from app.core.security import (
    get_password_hash,
    verify_password,
    generate_license_key as gen_license_key,
)
from app.schemas.user import (
    BalanceInfo,
    SubscriptionInfo,
    LicenseKeyInfo,
    UserProfileResponse,
)

logger = logging.getLogger(__name__)


class UserService:
    """Сервис для работы с пользователями"""
    
    @staticmethod
    def get_user_profile(db: Session, user_id: str) -> Optional[UserProfileResponse]:
        """
        Получить полный профиль пользователя
        
        Args:
            db: Database session
            user_id: ID пользователя
        
        Returns:
            UserProfileResponse или None
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        
        # Получить подписку
        subscription = db.query(Subscription).filter(
            Subscription.user_id == user.id
        ).order_by(Subscription.created_at.desc()).first()
        
        # Получить активный лицензионный ключ
        license_key = db.query(LicenseKey).filter(
            LicenseKey.user_id == user.id,
            LicenseKey.is_active == True
        ).order_by(LicenseKey.created_at.desc()).first()
        
        # Подготовить данные
        balance_credits = subscription.credits_balance if subscription else 0
        # Примерная стоимость: €0.003 за кредит
        # Округляем до 2 знаков после запятой для валидации
        from decimal import ROUND_HALF_UP
        eur_equivalent = (Decimal(balance_credits) * Decimal("0.003")).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        balance_info = BalanceInfo(
            credits=balance_credits,
            eur_equivalent=eur_equivalent
        )
        
        subscription_info = SubscriptionInfo(
            tier=subscription.plan_id if subscription else "free",
            expires_at=subscription.subscription_expires_at if subscription else None,
            monthly_limit=subscription.monthly_limit if subscription else None,
            used_this_month=subscription.used_this_month if subscription else 0,
            renewal_date=subscription.subscription_expires_at.strftime("%Y-%m-%d") if subscription and subscription.subscription_expires_at else None
        )
        
        if license_key:
            license_key_info = LicenseKeyInfo(
                id=str(license_key.id),
                display=license_key.key_display,
                created_at=license_key.created_at,
                last_used=license_key.last_used_at,
                active=license_key.is_active
            )
        else:
            # Если нет ключа, создаем пустой объект
            license_key_info = LicenseKeyInfo(
                id="",
                display="",
                created_at=datetime.utcnow(),
                last_used=None,
                active=False
            )
        
        return UserProfileResponse(
            id=str(user.id),
            email=user.email,
            is_admin=user.is_admin,
            is_superuser=user.is_admin,  # is_superuser = is_admin для совместимости
            email_verified=user.email_verified,
            created_at=user.created_at,
            balance=balance_info,
            subscription=subscription_info,
            license_key=license_key_info
        )
    
    @staticmethod
    def update_user_email(
        db: Session,
        user_id: str,
        new_email: str
    ) -> Tuple[Optional[User], Optional[str]]:
        """
        Обновить email пользователя
        
        Args:
            db: Database session
            user_id: ID пользователя
            new_email: Новый email
        
        Returns:
            Tuple[User, error_message]
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None, "User not found"
        
        # Проверить, не занят ли email
        existing_user = db.query(User).filter(
            User.email == new_email,
            User.id != user_id
        ).first()
        
        if existing_user:
            return None, "Email already in use"
        
        try:
            user.email = new_email
            user.email_verified = False  # Требуется повторная верификация
            user.email_verification_token = None
            
            db.commit()
            db.refresh(user)
            
            logger.info(f"User email updated: {user.id} -> {new_email}")
            return user, None
            
        except IntegrityError as e:
            db.rollback()
            logger.error(f"Error updating email: {e}")
            return None, "Failed to update email"
    
    @staticmethod
    def change_password(
        db: Session,
        user_id: str,
        old_password: str,
        new_password: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Сменить пароль пользователя
        
        Args:
            db: Database session
            user_id: ID пользователя
            old_password: Старый пароль
            new_password: Новый пароль
        
        Returns:
            Tuple[success, error_message]
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False, "User not found"
        
        if not user.password_hash:
            return False, "User registered via OAuth, password change not available"
        
        # Проверить старый пароль
        if not verify_password(old_password, user.password_hash):
            return False, "Invalid old password"
        
        # Установить новый пароль
        try:
            user.password_hash = get_password_hash(new_password)
            db.commit()
            
            logger.info(f"Password changed for user: {user.id}")
            return True, None
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error changing password: {e}")
            return False, "Failed to change password"
    
    @staticmethod
    def generate_license_key(
        db: Session,
        user_id: str
    ) -> Tuple[Optional[LicenseKey], Optional[str]]:
        """
        Сгенерировать новый лицензионный ключ для пользователя
        
        Args:
            db: Database session
            user_id: ID пользователя
        
        Returns:
            Tuple[LicenseKey, error_message]
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None, "User not found"
        
        try:
            from app.core.security import get_password_hash
            
            # Генерируем ключ
            key_display = gen_license_key()
            key_hash = get_password_hash(key_display)
            
            license_key = LicenseKey(
                user_id=user.id,
                key_hash=key_hash,
                key_display=key_display,
                is_active=True,
            )
            
            db.add(license_key)
            db.commit()
            db.refresh(license_key)
            
            logger.info(f"License key generated for user: {user.id}")
            return license_key, None
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error generating license key: {e}")
            return None, f"Failed to generate license key: {str(e)}"
    
    @staticmethod
    def revoke_license_key(
        db: Session,
        user_id: str,
        license_key_id: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Отозвать лицензионный ключ
        
        Args:
            db: Database session
            user_id: ID пользователя
            license_key_id: ID лицензионного ключа
        
        Returns:
            Tuple[success, error_message]
        """
        license_key = db.query(LicenseKey).filter(
            LicenseKey.id == license_key_id,
            LicenseKey.user_id == user_id
        ).first()
        
        if not license_key:
            return False, "License key not found"
        
        try:
            license_key.is_active = False
            license_key.revoked_at = datetime.utcnow()
            
            db.commit()
            
            logger.info(f"License key revoked: {license_key_id}")
            return True, None
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error revoking license key: {e}")
            return False, "Failed to revoke license key"


# Глобальный экземпляр
user_service = UserService()

