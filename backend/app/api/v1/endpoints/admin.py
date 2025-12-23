"""
Admin endpoints
GET /admin/users, PATCH /admin/users/{id}, GET /admin/logs
"""
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.api.v1.dependencies import get_current_admin_user
from app.models.user import User
from app.services.admin_service import admin_service
from app.schemas.admin import (
    AdminUserListResponse,
    AdminUserUpdateRequest,
    AdminUserUpdateResponse,
    AdminLogListResponse,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=AdminUserListResponse)
async def list_users(
    page: int = Query(1, ge=1, description="Номер страницы"),
    limit: int = Query(50, ge=1, le=100, description="Количество элементов на странице"),
    search: Optional[str] = Query(None, description="Поиск по email"),
    sort: str = Query("created_at", description="Сортировка (created_at, balance)"),
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Получить список всех пользователей (только для админов)
    
    - **page**: Номер страницы (начиная с 1)
    - **limit**: Количество элементов на странице (макс 100)
    - **search**: Поиск по email (частичное совпадение)
    - **sort**: Поле для сортировки (created_at или balance)
    """
    return admin_service.list_users(
        db=db,
        page=page,
        limit=limit,
        search=search,
        sort=sort
    )


@router.patch("/users/{user_id}", response_model=AdminUserUpdateResponse)
async def update_user(
    user_id: str,
    request: AdminUserUpdateRequest,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Обновить данные пользователя (только для админов)
    
    - **balance**: Новый баланс кредитов (опционально)
    - **is_blocked**: Заблокировать/разблокировать пользователя (опционально)
    - **is_admin**: Назначить/снять админ-права (опционально)
    """
    result, error = admin_service.update_user(
        db=db,
        user_id=user_id,
        balance=request.balance,
        is_blocked=request.is_blocked,
        is_admin=request.is_admin
    )
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    return result


@router.get("/logs", response_model=AdminLogListResponse)
async def list_logs(
    user_id: Optional[str] = Query(None, description="Фильтр по ID пользователя"),
    status: Optional[str] = Query(None, description="Фильтр по статусу (success, error, paused, completed)"),
    error_type: Optional[str] = Query(None, description="Фильтр по типу ошибки"),
    limit: int = Query(100, ge=1, le=1000, description="Максимальное количество записей"),
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Получить список логов расширения (только для админов)
    
    - **user_id**: Фильтр по ID пользователя (опционально)
    - **status**: Фильтр по статусу (опционально)
    - **error_type**: Фильтр по типу ошибки (опционально)
    - **limit**: Максимальное количество записей (макс 1000)
    
    ⚠️ **ВАЖНО**: Логи НЕ содержат тексты промптов, только метаданные!
    """
    return admin_service.list_logs(
        db=db,
        user_id=user_id,
        status=status,
        error_type=error_type,
        limit=limit
    )

