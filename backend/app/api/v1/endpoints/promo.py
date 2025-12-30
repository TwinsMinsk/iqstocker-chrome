"""
Promo endpoints - активация промокодов пользователем
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.api.v1.dependencies import get_current_user
from app.models.user import User
from app.services.promo_service import promo_service

router = APIRouter(prefix="/promo", tags=["promo"])


class RedeemPromoRequest(BaseModel):
    code: str = Field(..., min_length=3, max_length=50)


class RedeemPromoResponse(BaseModel):
    success: bool
    credits_added: int
    message: str


@router.post("/redeem", response_model=RedeemPromoResponse)
async def redeem_promo(
    request: RedeemPromoRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Активировать промокод для текущего пользователя"""
    # Проверка блокировки пользователя
    if user.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ваш аккаунт заблокирован. Активация промокодов недоступна."
        )
    
    credits, error = promo_service.redeem_promo(
        db=db,
        user_id=str(user.id),
        code=request.code
    )
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    return RedeemPromoResponse(
        success=True,
        credits_added=credits,
        message=f"Промокод активирован! Начислено {credits} кредитов."
    )

