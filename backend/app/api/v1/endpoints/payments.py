"""
Payment webhooks
POST /payments/webhook/tribute
"""
from fastapi import APIRouter, Request, HTTPException, status, Header, Depends
from fastapi.responses import JSONResponse
import json
import logging
import hashlib
from datetime import datetime

from app.services.payment_service import payment_service
from app.db.session import get_db
from sqlalchemy.orm import Session
from sqlalchemy.orm import Session as SASession
from app.models.tribute_webhook_event import TributeWebhookEvent

router = APIRouter(prefix="/payments", tags=["payments"])

logger = logging.getLogger(__name__)


def _mark_latest_event(db: Session, raw_body_sha256: str, **updates) -> None:
    """
    Обновить статус/поля у последней записи TributeWebhookEvent по raw_body_sha256.
    ВАЖНО: нельзя делать Query.update() вместе с limit(), поэтому делаем выбор id -> update по id.
    """
    _log_db = SASession(bind=db.get_bind())
    try:
        latest_id = (
            _log_db.query(TributeWebhookEvent.id)
            .filter(TributeWebhookEvent.raw_body_sha256 == raw_body_sha256)
            .order_by(TributeWebhookEvent.received_at.desc())
            .first()
        )
        if not latest_id:
            return
        _log_db.query(TributeWebhookEvent).filter(TributeWebhookEvent.id == latest_id[0]).update(updates)
        _log_db.commit()
    finally:
        _log_db.close()


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
        raw_sha256 = hashlib.sha256(body).hexdigest()
        
        # Распарсить JSON
        try:
            webhook_data = json.loads(body)
            
            # === ЛОГИРОВАНИЕ WEBHOOK JSON (ДЛЯ ОТЛАДКИ) ===
            # Логируем структурированный JSON для удобства чтения в логах Railway
            logger.info(f"[TRIBUTE WEBHOOK] Received event: {webhook_data.get('name', 'unknown')}")
            logger.info(f"[TRIBUTE WEBHOOK] Full payload: {json.dumps(webhook_data, indent=2, ensure_ascii=False)}")
            logger.info(f"[TRIBUTE WEBHOOK] Signature: {trbt_signature[:20]}...")
            # ==============================================
        except json.JSONDecodeError:
            # Логируем факт получения даже при невалидном JSON
            _log_db = SASession(bind=db.get_bind())
            try:
                evt = TributeWebhookEvent(
                    name=None,
                    created_at=None,
                    sent_at=None,
                    period_id=None,
                    payment_id=None,
                    telegram_user_id=None,
                    tribute_user_id=None,
                    currency=None,
                    amount=None,
                    signature=trbt_signature,
                    raw_body_sha256=raw_sha256,
                    raw_body=body.decode("utf-8", errors="replace")[:8192],
                    status="error",
                    http_status=status.HTTP_400_BAD_REQUEST,
                    error_message="Invalid JSON",
                    processed_at=datetime.utcnow(),
                )
                _log_db.add(evt)
                _log_db.commit()
            finally:
                _log_db.close()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON"
            )

        # === Логирование входящего webhook (независимо от успеха обработки) ===
        # ВАЖНО: используем отдельную сессию на том же bind, чтобы rollback бизнес-логики
        # не стирал журнал входящих событий.
        log_db = SASession(bind=db.get_bind())
        evt = None
        try:
            payload = webhook_data.get("payload", {}) if isinstance(webhook_data, dict) else {}
            name = webhook_data.get("name") if isinstance(webhook_data, dict) else None
            created_at = webhook_data.get("created_at") if isinstance(webhook_data, dict) else None
            sent_at = webhook_data.get("sent_at") if isinstance(webhook_data, dict) else None

            def _parse_dt(v):
                if not v:
                    return None
                try:
                    # Tribute использует ISO8601 с Z, Fast path: заменить на +00:00
                    return datetime.fromisoformat(str(v).replace("Z", "+00:00"))
                except Exception:
                    return None

            evt = TributeWebhookEvent(
                name=str(name) if name else None,
                created_at=_parse_dt(created_at),
                sent_at=_parse_dt(sent_at),
                period_id=str(payload.get("period_id")) if payload.get("period_id") is not None else None,
                payment_id=str(payload.get("payment_id") or payload.get("id")) if (payload.get("payment_id") or payload.get("id")) else None,
                telegram_user_id=str(payload.get("telegram_user_id")) if payload.get("telegram_user_id") is not None else None,
                tribute_user_id=str(payload.get("user_id")) if payload.get("user_id") is not None else None,
                currency=str(payload.get("currency")).lower() if payload.get("currency") else None,
                amount=int(payload.get("amount")) if isinstance(payload.get("amount"), (int, float)) else None,
                signature=trbt_signature,
                raw_body_sha256=raw_sha256,
                raw_body=body.decode("utf-8", errors="replace")[:8192],
                status="received",
                http_status=None,
                error_message=None,
                processed_at=None,
            )
            log_db.add(evt)
            log_db.commit()
        except Exception as e:
            # Fail-open: не блокируем обработку webhook, если логирование не удалось
            logger.warning(f"Failed to log Tribute webhook event: {e}")
            try:
                log_db.rollback()
            except Exception:
                pass
        finally:
            log_db.close()
        
        # Обработать webhook
        result = await payment_service.process_tribute_webhook(
            db=db,
            webhook_data=webhook_data,
            request_body=body,
            signature=trbt_signature
        )
        
        if result["status"] == "error":
            # Согласно документации Tribute: 401 для неверной подписи, 400 для невалидных данных.
            # Док: https://wiki.tribute.tg/for-content-creators/api-documentation/webhooks
            if result.get("error_code") == "invalid_signature":
                _mark_latest_event(
                    db,
                    raw_sha256,
                    status="invalid_signature",
                    http_status=status.HTTP_401_UNAUTHORIZED,
                    error_message="Invalid signature",
                    processed_at=datetime.utcnow(),
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid webhook signature",
                )
            _mark_latest_event(
                db,
                raw_sha256,
                status="error",
                http_status=status.HTTP_400_BAD_REQUEST,
                error_message=str(result.get("message") or "Webhook processing failed"),
                processed_at=datetime.utcnow(),
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("message", "Webhook processing failed")
            )
        
        if result["status"] == "already_processed":
            _mark_latest_event(
                db,
                raw_sha256,
                status="already_processed",
                http_status=200,
                processed_at=datetime.utcnow(),
            )
            return JSONResponse(
                status_code=200,
                content={"status": "already_processed"}
            )

        if result["status"] == "ignored":
            _mark_latest_event(
                db,
                raw_sha256,
                status="ignored",
                http_status=200,
                processed_at=datetime.utcnow(),
            )
            return JSONResponse(status_code=200, content={"status": "ignored"})

        _mark_latest_event(
            db,
            raw_sha256,
            status="processed",
            http_status=200,
            processed_at=datetime.utcnow(),
        )
        
        return JSONResponse(
            status_code=200,
            content={"status": "ok"}
        )
        
    except HTTPException:
        # Пробрасываем HTTPException дальше, чтобы FastAPI обработал его правильно
        raise
    except Exception as e:
        logger.error(f"Error processing Tribute webhook: {e}", exc_info=True)
        try:
            raw_sha256 = raw_sha256 if "raw_sha256" in locals() else None
            if raw_sha256:
                _mark_latest_event(
                    db,
                    raw_sha256,
                    status="error",
                    http_status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    error_message=f"Unhandled error: {str(e)}",
                    processed_at=datetime.utcnow(),
                )
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook processing error: {str(e)}"
        )
