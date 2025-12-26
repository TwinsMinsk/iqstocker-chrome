"""
Сервис аутентификации
Бизнес-логика для регистрации, входа, OAuth
"""
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional, Tuple
from datetime import datetime, timedelta
import logging

from app.models.user import User
from app.models.subscription import Subscription
from app.models.license_key import LicenseKey
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    generate_license_key as gen_license_key,
    google_oauth_handler,
)
from app.utils.email_service import email_service, generate_verification_token
from app.core.config import settings

logger = logging.getLogger(__name__)


class AuthService:
    """Сервис для работы с аутентификацией"""
    
    @staticmethod
    def create_user(
        db: Session,
        email: str,
        password: str,
        oauth_google_id: Optional[str] = None,
        email_verified: bool = True  # По умолчанию email считается верифицированным (упрощенная регистрация)
    ) -> Tuple[Optional[User], Optional[str]]:
        """
        Создать нового пользователя
        
        Args:
            db: Database session
            email: Email пользователя
            password: Пароль (будет захеширован)
            oauth_google_id: Google OAuth ID (опционально)
            email_verified: Email уже верифицирован (по умолчанию True для упрощенной регистрации)
        
        Returns:
            Tuple[User, error_message]
            Если успешно: (User, None)
            Если ошибка: (None, error_message)
        """
        try:
            # Проверка существующего пользователя
            existing_user = db.query(User).filter(User.email == email).first()
            if existing_user:
                return None, "User with this email already exists"
            
            # Если OAuth, проверяем по google_id
            if oauth_google_id:
                existing_oauth_user = db.query(User).filter(
                    User.oauth_google_id == oauth_google_id
                ).first()
                if existing_oauth_user:
                    return None, "User with this Google account already exists"
            
            # Упрощенная регистрация: не генерируем токен верификации
            # Email считается верифицированным сразу
            verification_token = None
            
            # Проверка длины пароля в байтах (bcrypt ограничение: 72 байта)
            if password:
                password_bytes = password.encode('utf-8')
                if len(password_bytes) > 72:
                    return None, "Пароль не может быть длиннее 72 байт. Используйте более короткий пароль"
            
            # Создаём пользователя
            try:
                password_hash = get_password_hash(password) if password else ""
            except ValueError as e:
                # Ошибка от bcrypt (например, пароль слишком длинный)
                error_msg = str(e)
                if "72 bytes" in error_msg.lower():
                    return None, "Пароль не может быть длиннее 72 байт. Используйте более короткий пароль"
                return None, f"Ошибка обработки пароля: {error_msg}"
            
            # Упрощенная регистрация: email сразу верифицирован
            user = User(
                email=email,
                password_hash=password_hash,
                oauth_google_id=oauth_google_id,
                email_verified=True,  # Всегда True для упрощенной регистрации
                email_verification_token=None,  # Не нужен токен
                email_verified_at=datetime.utcnow(),  # Сразу устанавливаем время верификации
                is_active=True,
                is_admin=False,
            )
            
            db.add(user)
            db.flush()  # Получаем user.id без commit
            
            # Создаём бесплатную подписку с 50 кредитами
            subscription = AuthService.create_free_subscription(db, user.id)
            if not subscription:
                db.rollback()
                return None, "Failed to create subscription"
            
            # Создаём лицензионный ключ
            license_key = AuthService.create_license_key(db, user.id)
            if not license_key:
                db.rollback()
                return None, "Failed to create license key"
            
            db.commit()
            db.refresh(user)
            
            # Упрощенная регистрация: не отправляем письма верификации
            # Можно оставить только welcome email (опционально)
            # if email_service:
            #     try:
            #         email_service.send_welcome_email(user.email)
            #     except Exception as e:
            #         logger.warning(f"Failed to send welcome email: {e}")
            
            logger.info(f"User created successfully: {user.email}")
            return user, None
            
        except IntegrityError as e:
            db.rollback()
            logger.error(f"Integrity error creating user: {e}")
            return None, "User with this email or Google account already exists"
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating user: {e}")
            return None, f"Failed to create user: {str(e)}"
    
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        """
        Аутентифицировать пользователя по email и паролю
        
        Args:
            db: Database session
            email: Email пользователя
            password: Пароль
        
        Returns:
            User если успешно, None если ошибка
        """
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            return None
        
        if not user.is_active:
            return None
        
        if not user.password_hash:
            # Пользователь зарегистрирован через OAuth, нет пароля
            return None
        
        if not verify_password(password, user.password_hash):
            return None
        
        return user
    
    @staticmethod
    def create_free_subscription(db: Session, user_id: str) -> Optional[Subscription]:
        """
        Создать бесплатную подписку с 50 кредитами
        
        Args:
            db: Database session
            user_id: ID пользователя
        
        Returns:
            Subscription или None
        """
        try:
            # Проверяем, нет ли уже подписки у пользователя
            existing = db.query(Subscription).filter(Subscription.user_id == user_id).first()
            if existing:
                logger.info(f"Subscription already exists for user {user_id}, updating balance")
                existing.credits_balance = 50
                existing.status = "active"
                existing.plan_id = "free"
                db.flush()
                return existing
            
            subscription = Subscription(
                user_id=user_id,
                plan_id="free",
                status="active",
                credits_balance=50,  # 50 бесплатных кредитов
                monthly_limit=None,  # Без лимита для free плана
                used_this_month=0,
                subscription_starts_at=datetime.utcnow(),
                subscription_expires_at=None,  # Бессрочная подписка
            )
            
            db.add(subscription)
            db.flush()
            logger.info(f"Created free subscription for user {user_id} with 50 credits")
            return subscription
            
        except Exception as e:
            logger.error(f"Error creating subscription for user {user_id}: {e}", exc_info=True)
            return None
    
    @staticmethod
    def create_license_key(db: Session, user_id: str) -> Optional[LicenseKey]:
        """
        Создать лицензионный ключ для пользователя
        
        Args:
            db: Database session
            user_id: ID пользователя
        
        Returns:
            LicenseKey или None
        """
        try:
            from app.core.security import get_password_hash
            
            # Генерируем ключ
            key_display = gen_license_key()
            key_hash = get_password_hash(key_display)  # Хешируем для безопасности
            
            license_key = LicenseKey(
                user_id=user_id,
                key_hash=key_hash,
                key_display=key_display,
                is_active=True,
            )
            
            db.add(license_key)
            db.flush()
            return license_key
            
        except Exception as e:
            logger.error(f"Error creating license key: {e}")
            return None
    
    @staticmethod
    def verify_email(db: Session, token: str) -> Tuple[Optional[User], Optional[str]]:
        """
        Верифицировать email по токену
        
        Args:
            db: Database session
            token: Токен верификации
        
        Returns:
            Tuple[User, error_message]
        """
        user = db.query(User).filter(User.email_verification_token == token).first()
        
        if not user:
            return None, "Invalid verification token"
        
        if user.email_verified:
            return user, None  # Уже верифицирован
        
        # Верифицируем
        user.email_verified = True
        user.email_verified_at = datetime.utcnow()
        user.email_verification_token = None
        
        try:
            db.commit()
            db.refresh(user)
            logger.info(f"Email verified for user: {user.email}")
            return user, None
        except Exception as e:
            db.rollback()
            logger.error(f"Error verifying email: {e}")
            return None, "Failed to verify email"
    
    @staticmethod
    async def oauth_google_login(
        db: Session,
        code: str,
        redirect_uri: str
    ) -> Tuple[Optional[User], Optional[str]]:
        """
        Войти через Google OAuth
        
        Args:
            db: Database session
            code: Authorization code от Google
            redirect_uri: Redirect URI
        
        Returns:
            Tuple[User, error_message]
        """
        # Получаем информацию о пользователе от Google
        google_user_info = await google_oauth_handler.verify_google_token(code, redirect_uri)
        
        if not google_user_info:
            return None, "Failed to verify Google token"
        
        google_id = google_user_info.get("id")
        email = google_user_info.get("email")
        
        if not google_id or not email:
            return None, "Invalid Google user info"
        
        # Проверяем существующего пользователя
        user = db.query(User).filter(
            (User.oauth_google_id == google_id) | (User.email == email)
        ).first()
        
        if user:
            # Обновляем oauth_google_id если нужно
            if not user.oauth_google_id:
                user.oauth_google_id = google_id
                db.commit()
                db.refresh(user)
            
            # Если email не верифицирован, верифицируем (OAuth email уже верифицирован Google)
            if not user.email_verified:
                user.email_verified = True
                user.email_verified_at = datetime.utcnow()
                db.commit()
                db.refresh(user)
            
            return user, None
        
        # Создаём нового пользователя
        user, error = AuthService.create_user(
            db=db,
            email=email,
            password="",  # OAuth не требует пароля
            oauth_google_id=google_id,
            email_verified=True,  # Google уже верифицировал email
        )
        
        if error:
            return None, error
        
        return user, None
    
    @staticmethod
    def create_tokens(user: User) -> dict:
        """
        Создать access и refresh токены для пользователя
        
        Args:
            user: User объект
        
        Returns:
            Словарь с токенами
        """
        # Преобразуем UUID в строку для JWT
        user_id_str = str(user.id) if hasattr(user.id, '__str__') else user.id
        
        token_data = {
            "sub": user_id_str,
            "email": user.email,
            "is_admin": user.is_admin,
        }
        
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        # Вычисляем expires_in (секунды)
        expires_in = settings.JWT_EXPIRY_DAYS * 24 * 60 * 60
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": expires_in,
        }


# Глобальный экземпляр
auth_service = AuthService()

