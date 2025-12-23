"""
Billing endpoints
GET /subscriptions/plans, POST /subscriptions/purchase-plan, etc.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.schemas.billing import (
    PlanResponse,
    PurchasePlanRequest,
    PurchasePlanResponse,
    TransactionResponse,
    TransactionsListResponse,
    SubscriptionResponse,
)
from app.services.billing_service import billing_service
from app.api.v1.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/subscriptions", tags=["billing"])


@router.get("/plans", response_model=list[PlanResponse])
async def get_plans():
    """
    Получить список всех доступных планов подписки
    
    Не требует аутентификации
    """
    plans = billing_service.get_plans()
    return [PlanResponse(**plan) for plan in plans]


@router.post("/purchase-plan", response_model=PurchasePlanResponse)
async def purchase_plan(
    request: PurchasePlanRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Создать платеж для покупки плана подписки
    
    Создаёт транзакцию и возвращает payment_url для редиректа на Tribute
    """
    try:
        result = await billing_service.create_payment(
            db=db,
            user=user,
            plan_id=request.plan_id
        )
        return PurchasePlanResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payment: {str(e)}"
        )


@router.get("/me", response_model=SubscriptionResponse)
async def get_my_subscription(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получить текущую подписку пользователя
    """
    subscription = billing_service.get_user_subscription(db, str(user.id))
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    return SubscriptionResponse.model_validate(subscription)


# Transactions endpoints (обычно в отдельном router, но для простоты здесь)
@router.get("/transactions", response_model=TransactionsListResponse)
async def get_transactions(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получить историю транзакций пользователя
    """
    result = billing_service.get_user_transactions(
        db=db,
        user_id=str(user.id),
        limit=limit,
        offset=offset
    )
    
    return TransactionsListResponse(
        total=result["total"],
        transactions=[TransactionResponse.model_validate(t) for t in result["transactions"]],
        pagination=result["pagination"]
    )
