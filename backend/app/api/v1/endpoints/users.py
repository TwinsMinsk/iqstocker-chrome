"""
User endpoints
GET /users/me, PATCH /users/me, etc.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.user import (
    UserProfileResponse,
    UpdateUserRequest,
    ChangePasswordRequest,
    LicenseKeyResponse,
)
from app.services.user_service import user_service
from app.api.v1.dependencies import get_current_user
from app.models.user import User

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
    
    return LicenseKeyResponse.model_validate(license_key)


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
