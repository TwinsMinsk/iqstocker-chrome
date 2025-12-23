"""
Payment webhooks
POST /payments/webhook/tribute
"""
from fastapi import APIRouter, Request, HTTPException, status, Header, Depends
from fastapi.responses import JSONResponse
import json
import logging

from app.services.payment_service import payment_service
from app.db.session import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/payments", tags=["payments"])

logger = logging.getLogger(__name__)


@router.post("/webhook/tribute")
async def tribute_webhook(
    request: Request,
    trbt_signature: str = Header(..., alias="trbt-signature"),
    db: Session = Depends(get_db)
):
    """
    Webhook endpoint для обработки платежей от Telegram Tribute
    
    Проверяет HMAC-SHA256 подпись и обрабатывает события:
    - new_subscription: новая подписка
    - cancelled_subscription: отмена подписки
    """
    try:
        # Получить тело запроса
        body = await request.body()
        
        # Распарсить JSON
        webhook_data = json.loads(body)
        
        # Обработать webhook
        result = await payment_service.process_tribute_webhook(
            db=db,
            webhook_data=webhook_data,
            request_body=body,
            signature=trbt_signature
        )
        
        if result["status"] == "error":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("message", "Webhook processing failed")
            )
        
        if result["status"] == "already_processed":
            return JSONResponse(
                status_code=200,
                content={"status": "already_processed"}
            )
        
        return JSONResponse(
            status_code=200,
            content={"status": "ok"}
        )
        
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON"
        )
    except Exception as e:
        logger.error(f"Error processing Tribute webhook: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook processing error: {str(e)}"
        )
