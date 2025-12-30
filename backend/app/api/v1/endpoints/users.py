"""
User endpoints
GET /users/me, PATCH /users/me, etc.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.schemas.user import (
    UserProfileResponse,
    UpdateUserRequest,
    ChangePasswordRequest,
    LicenseKeyResponse,
)
from app.services.user_service import user_service
from app.services.referral_service import referral_service
from app.api.v1.dependencies import get_current_user
from app.models.user import User
from pydantic import BaseModel

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получить полный профиль текущего пользователя
    
    Включает:
    - Баланс кредитов
    - Информацию о подписке
    - Лицензионный ключ
    """
    profile = user_service.get_user_profile(db, str(user.id))
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    return profile


@router.patch("/me", response_model=UserProfileResponse)
async def update_my_profile(
    request: UpdateUserRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Обновить профиль пользователя
    
    Можно обновить email (требует повторной верификации)
    """
    if not request.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    updated_user, error = user_service.update_user_email(
        db=db,
        user_id=str(user.id),
        new_email=request.email
    )
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    # Вернуть обновленный профиль
    profile = user_service.get_user_profile(db, str(user.id))
    return profile


@router.patch("/me/password")
async def change_my_password(
    request: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Сменить пароль пользователя
    
    Требует старый пароль для подтверждения
    """
    # Валидация нового пароля
    validation_error = request.validate_passwords()
    if validation_error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=validation_error
        )
    
    success, error = user_service.change_password(
        db=db,
        user_id=str(user.id),
        old_password=request.old_password,
        new_password=request.new_password
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to change password"
        )
    
    return {
        "success": True,
        "message": "Password changed successfully"
    }


@router.post("/me/license-keys", response_model=LicenseKeyResponse, status_code=status.HTTP_201_CREATED)
async def generate_license_key(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Сгенерировать новый лицензионный ключ
    
    Пользователь может иметь несколько активных ключей
    """
    license_key, error = user_service.generate_license_key(
        db=db,
        user_id=str(user.id)
    )
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    if not license_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate license key"
        )
    
    # Преобразуем модель LicenseKey в словарь для LicenseKeyResponse
    return LicenseKeyResponse(
        id=str(license_key.id),
        display=license_key.key_display,
        created_at=license_key.created_at,
        active=license_key.is_active
    )


@router.delete("/me/license-keys/{key_id}")
async def revoke_license_key(
    key_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Отозвать лицензионный ключ
    
    Ключ будет деактивирован и не сможет использоваться
    """
    success, error = user_service.revoke_license_key(
        db=db,
        user_id=str(user.id),
        license_key_id=key_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Failed to revoke license key"
        )
    
    return {
        "success": True,
        "message": "License key revoked successfully"
    }


# === REFERRAL STATS ===

class ReferralStatsResponse(BaseModel):
    referral_code: Optional[str]
    invited_count: int
    total_earned_credits: int


@router.get("/me/referral", response_model=ReferralStatsResponse)
async def get_my_referral_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получить статистику рефералов для текущего пользователя
    
    Включает:
    - Реферальный код пользователя (генерируется автоматически если отсутствует)
    - Количество приглашённых пользователей
    - Общее количество заработанных кредитов
    """
    try:
        # Убеждаемся что у пользователя есть referral_code (для старых пользователей)
        if not user.referral_code:
            try:
                referral_service.assign_referral_code(db, user)
                db.refresh(user)
            except Exception as e:
                # Если не удалось сгенерировать код, продолжаем без него
                # (статистика всё равно будет работать)
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to assign referral code to user {user.id}: {e}")
        
        stats = referral_service.get_referral_stats(db, str(user.id))
        return ReferralStatsResponse(**stats)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in get_my_referral_stats for user {user.id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch referral stats: {str(e)}"
        )
