"""
Безопасность: JWT, хеширование паролей, OAuth
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
import httpx
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверить пароль"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Получить хеш пароля
    
    ВАЖНО: bcrypt имеет ограничение в 72 байта.
    Если пароль длиннее, он будет автоматически обрезан до 72 байт.
    """
    # Проверка длины в байтах (bcrypt ограничение: 72 байта)
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        # Обрезаем до 72 байт
        password = password_bytes[:72].decode('utf-8', errors='ignore')
        logger.warning("Password truncated to 72 bytes for bcrypt compatibility")
    
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Создать JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.JWT_EXPIRY_DAYS)
    
    to_encode.update({"exp": expire, "type": "access"})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Создать JWT refresh token (30 дней)"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=30)
    
    to_encode.update({"exp": expire, "type": "refresh"})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def verify_token(token: str, token_type: str = "access") -> Optional[dict]:
    """Проверить и декодировать JWT token"""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        # Проверка типа токена
        if payload.get("type") != token_type:
            return None
        
        return payload
    except JWTError:
        return None


def generate_license_key() -> str:
    """Генерировать лицензионный ключ"""
    import secrets
    import string
    
    # Формат: sk_live_xxxxxxxxxxxx
    random_part = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(16))
    return f"sk_live_{random_part}"


class GoogleOAuthHandler:
    """Обработчик OAuth Google"""
    
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USER_INFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
    
    def __init__(self):
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET
    
    async def get_access_token(self, code: str, redirect_uri: str) -> Optional[str]:
        """
        Получить access token от Google используя authorization code
        
        Args:
            code: Authorization code от Google
            redirect_uri: Redirect URI который использовался для получения code
        
        Returns:
            Access token или None если ошибка
        """
        if not self.client_id or not self.client_secret:
            logger.warning("Google OAuth not configured")
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.TOKEN_URL,
                    data={
                        "code": code,
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "redirect_uri": redirect_uri,
                        "grant_type": "authorization_code",
                    },
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("access_token")
                else:
                    logger.error(f"Failed to get Google token: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error getting Google token: {e}")
            return None
    
    async def get_user_info(self, access_token: str) -> Optional[Dict[str, Any]]:
        """
        Получить информацию о пользователе от Google
        
        Args:
            access_token: Google access token
        
        Returns:
            Словарь с информацией о пользователе или None
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.USER_INFO_URL,
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to get Google user info: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error getting Google user info: {e}")
            return None
    
    async def verify_google_token(self, code: str, redirect_uri: str) -> Optional[Dict[str, Any]]:
        """
        Получить и верифицировать Google token, вернуть информацию о пользователе
        
        Args:
            code: Authorization code
            redirect_uri: Redirect URI
        
        Returns:
            Информация о пользователе или None
        """
        access_token = await self.get_access_token(code, redirect_uri)
        if not access_token:
            return None
        
        return await self.get_user_info(access_token)


# Глобальный экземпляр
google_oauth_handler = GoogleOAuthHandler()

