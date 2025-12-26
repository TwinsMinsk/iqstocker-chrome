"""
Authentication endpoints
POST /auth/register, /auth/login, /auth/refresh, etc.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    GoogleOAuthRequest,
    EmailVerificationRequest,
    UserResponse,
)
from app.services.auth_service import auth_service
from app.core.security import verify_token, create_access_token, create_refresh_token
from app.core.config import settings
from app.api.v1.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Регистрация нового пользователя (упрощенная, без подтверждения email)
    
    - Создаёт пользователя с email и password
    - Email автоматически считается верифицированным
    - Создаёт бесплатную подписку с начальными кредитами (из FREE_CREDITS_AMOUNT)
    - Создаёт лицензионный ключ
    - Возвращает access и refresh токены
    - Пользователь может сразу войти в личный кабинет
    """
    user, error = auth_service.create_user(
        db=db,
        email=request.email,
        password=request.password,
    )
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    tokens = auth_service.create_tokens(user)
    return TokenResponse(**tokens)


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Вход пользователя по email и password
    
    Возвращает access и refresh токены
    """
    user = auth_service.authenticate_user(db, request.email, request.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    tokens = auth_service.create_tokens(user)
    return TokenResponse(**tokens)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """
    Обновить access token используя refresh token
    """
    # Проверяем refresh token
    payload = verify_token(request.refresh_token, token_type="refresh")
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    # Создаём новые токены
    token_data = {
        "sub": user_id,
        "email": payload.get("email", ""),
        "is_admin": payload.get("is_admin", False),
    }
    
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    expires_in = settings.JWT_EXPIRY_DAYS * 24 * 60 * 60
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=expires_in,
    )


@router.post("/logout")
async def logout():
    """
    Выход пользователя
    
    Примечание: В JWT-based аутентификации logout обычно делается на клиенте
    (удаление токенов из localStorage). Здесь можно добавить blacklist токенов
    если нужно, но для MVP это не обязательно.
    """
    return {"message": "Logged out successfully"}


@router.get("/google/callback")
async def google_oauth_callback(
    code: str = Query(..., description="Authorization code from Google"),
    redirect_uri: str = Query(..., description="Redirect URI used for OAuth"),
    db: Session = Depends(get_db)
):
    """
    OAuth Google callback endpoint
    
    Получает authorization code от Google и создаёт/находит пользователя
    """
    user, error = await auth_service.oauth_google_login(
        db=db,
        code=code,
        redirect_uri=redirect_uri
    )
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    tokens = auth_service.create_tokens(user)
    return TokenResponse(**tokens)


@router.post("/google", response_model=TokenResponse)
async def google_oauth(
    request: GoogleOAuthRequest,
    db: Session = Depends(get_db)
):
    """
    OAuth Google login (POST версия)
    
    Альтернативный endpoint для OAuth, принимает code в теле запроса
    """
    user, error = await auth_service.oauth_google_login(
        db=db,
        code=request.code,
        redirect_uri=request.redirect_uri
    )
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    tokens = auth_service.create_tokens(user)
    return TokenResponse(**tokens)


@router.get("/verify-email")
async def verify_email(
    token: str = Query(..., description="Email verification token"),
    db: Session = Depends(get_db)
):
    """
    Верификация email по токену из письма
    
    Обычно вызывается по ссылке из email письма
    """
    user, error = auth_service.verify_email(db, token)
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    return {
        "message": "Email verified successfully",
        "user": UserResponse.model_validate(user)
    }


@router.post("/verify-email", response_model=UserResponse)
async def verify_email_post(
    request: EmailVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Верификация email (POST версия)
    
    Альтернативный endpoint для верификации, принимает token в теле запроса
    """
    user, error = auth_service.verify_email(db, request.token)
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    return UserResponse.model_validate(user)


@router.get("/me", response_model=UserResponse)
async def get_me(
    user = Depends(get_current_user)
):
    """
    Получить информацию о текущем пользователе
    
    Требует JWT токен в заголовке Authorization
    """
    return UserResponse.model_validate(user)
