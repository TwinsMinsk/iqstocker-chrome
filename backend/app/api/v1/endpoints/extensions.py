"""
Extension endpoints - Защищённые endpoints для расширения
POST /extensions/validate-key, POST /extensions/batch-validate, etc.
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.schemas.extension import (
    ValidateKeyRequest, ValidateKeyResponse,
    BatchValidateRequest, BatchValidateResponse,
    FinalizeSessionRequest, FinalizeSessionResponse,
    DeductCreditRequest, DeductCreditResponse,
    BindLicenseRequest, BindLicenseResponse,
    LogUsageRequest, LogUsageResponse,
    BalanceResponse
)
from app.services.extension_service import get_extension_service
from app.api.v1.dependencies import get_current_user_optional
from app.integrations.redis_client import get_redis_client
from app.models.extension_log import ExtensionLog

router = APIRouter(prefix="/extensions", tags=["extensions"])


# ==================== CORE ENDPOINTS ====================

@router.post("/validate-key", response_model=ValidateKeyResponse)
async def validate_key(
    request: ValidateKeyRequest,
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Валидация лицензионного ключа (legacy endpoint).
    
    Используется для первоначальной проверки ключа.
    Для batch операций используйте /batch-validate.
    """
    service = get_extension_service(db, redis_client)
    
    result = await service.validate_license_key(request.key)
    
    if not result:
        return ValidateKeyResponse(
            valid=False,
            error="invalid_or_expired_key",
            message="License key is invalid or expired"
        )
    
    license_obj, subscription, user = result
    
    return ValidateKeyResponse(
        valid=True,
        user_id=str(user.id),
        subscription_active=subscription.status == "active" and not subscription.is_expired(),
        tier=subscription.plan_id,
        expires_at=subscription.subscription_expires_at,
        balance=subscription.credits_balance,
        monthly_limit=subscription.monthly_limit,
        used_this_month=subscription.used_this_month
    )


@router.post("/batch-validate", response_model=BatchValidateResponse)
async def batch_validate(
    request: BatchValidateRequest,
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    🔥 ОСНОВНОЙ ENDPOINT ДЛЯ ЗАЩИТЫ 🔥
    
    Batch validation - запрос разрешения на всю сессию.
    Резервирует кредиты и возвращает session token.
    
    Использование:
    1. Расширение вызывает этот endpoint перед началом работы
    2. Backend валидирует лицензию и резервирует кредиты
    3. Расширение получает session_token и работает БЕЗ дополнительных API запросов
    4. После завершения расширение вызывает /finalize-session
    
    Преимущества:
    - Минимальная латентность (1 запрос вместо 100+)
    - Полный контроль над использованием
    - Невозможно обойти лицензирование
    """
    service = get_extension_service(db, redis_client)
    
    result = await service.batch_validate(
        license_key=request.license_key,
        prompts_count=request.prompts_count
    )
    
    if not result.get("allowed"):
        return BatchValidateResponse(
            allowed=False,
            error=result.get("error"),
            message=result.get("message")
        )
    
    return BatchValidateResponse(
        allowed=True,
        session_token=result["session_token"],
        expires_at=result["expires_at"],
        config=result["config"],
        credits_reserved=result["credits_reserved"],
        credits_remaining=result["credits_remaining"]
    )


@router.post("/deduct-credit", response_model=DeductCreditResponse)
async def deduct_credit(
    request: DeductCreditRequest,
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Списать один кредит за успешно отправленный промпт.
    
    Вызывается сразу после успешной отправки промпта в Discord.
    Кредиты списываются только при успешной отправке, не при ошибках.
    
    ВАЖНО: Этот endpoint должен вызываться только после подтверждения успешной отправки.
    """
    service = get_extension_service(db, redis_client)
    
    result = await service.deduct_credit(
        session_token=request.session_token,
        prompt_index=request.prompt_index
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    
    return DeductCreditResponse(
        success=True,
        message=result["message"],
        credits_remaining=result["credits_remaining"],
        credits_deducted=result.get("credits_deducted", 1)
    )


@router.post("/finalize-session", response_model=FinalizeSessionResponse)
async def finalize_session(
    request: FinalizeSessionRequest,
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Финализация сессии - подтверждение использования кредитов.
    
    Вызывается после завершения работы расширения.
    
    ВАЖНО: Кредиты уже списаны через /deduct-credit при успешной отправке каждого промпта.
    Этот endpoint только финализирует сессию и не списывает кредиты повторно.
    """
    service = get_extension_service(db, redis_client)
    
    result = await service.finalize_session(
        session_token=request.session_token,
        prompts_sent=request.prompts_sent,
        errors_count=request.errors_count,
        duration_seconds=request.duration_seconds
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    
    return FinalizeSessionResponse(
        success=True,
        message=result["message"],
        credits_used=result["credits_used"],
        credits_remaining=result["credits_remaining"],
        session_duration_seconds=result.get("session_duration_seconds")
    )


# ==================== FINGERPRINTING (OPTIONAL) ====================

@router.post("/bind-license", response_model=BindLicenseResponse)
async def bind_license(
    request: BindLicenseRequest,
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Привязать лицензию к устройству (fingerprinting).
    
    Опционально. Включается через FINGERPRINTING_ENABLED в config.
    Мягкая привязка - до 3 устройств, email уведомления при превышении.
    """
    service = get_extension_service(db, redis_client)
    
    result = await service.bind_license_to_device(
        license_key=request.license_key,
        fingerprint=request.fingerprint,
        device_info=request.device_info
    )
    
    return BindLicenseResponse(
        status=result["status"],
        message=result.get("message"),
        devices_count=result.get("devices_count")
    )


# ==================== UTILITY ENDPOINTS ====================

@router.get("/balance", response_model=BalanceResponse)
async def get_balance(
    license_key: str = Header(..., alias="X-License-Key"),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Получить текущий баланс пользователя.
    
    Используется расширением для отображения баланса в UI.
    """
    service = get_extension_service(db, redis_client)
    
    result = await service.validate_license_key(license_key)
    
    if not result:
        raise HTTPException(status_code=401, detail="Invalid license key")
    
    license_obj, subscription, user = result
    
    return BalanceResponse(
        balance=subscription.credits_balance,
        subscription_expires=subscription.subscription_expires_at,
        monthly_limit=subscription.monthly_limit,
        used_this_month=subscription.used_this_month,
        last_sync=subscription.updated_at
    )


@router.post("/log-usage", response_model=LogUsageResponse)
async def log_usage(
    request: LogUsageRequest,
    license_key: Optional[str] = Header(None, alias="X-License-Key"),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client),
):
    """
    Логировать использование расширения.
    
    ВАЖНО: НЕ СОХРАНЯЕМ тексты промптов, только метаданные!
    Используется для аналитики и отладки.
    """
    if not license_key:
        raise HTTPException(status_code=401, detail="Missing X-License-Key")

    service = get_extension_service(db, redis_client)
    validated = await service.validate_license_key(license_key)
    if not validated:
        raise HTTPException(status_code=401, detail="Invalid license key")

    _, _, user = validated

    def _safe_int(v, default: int = 0) -> int:
        try:
            return int(v)
        except Exception:
            return default

    def _status_from_counts(total: int, errors: int) -> str:
        total = max(0, _safe_int(total))
        errors = max(0, _safe_int(errors))
        if total == 0 and errors == 0:
            return "paused"
        if total == 0 and errors > 0:
            return "error"
        if errors == 0:
            return "success"
        return "completed"

    def _sanitize_events(events) -> tuple[Optional[str], Optional[str]]:
        """
        Максимально безопасное логирование:
        - НЕ сохраняем тексты промптов
        - выкидываем подозрительные ключи (prompt/text/content)
        - ограничиваем размер
        Возвращаем (error_type, error_message) — обе строки могут быть None.
        """
        if not events:
            return None, None

        if not isinstance(events, list):
            return None, None

        allowed_keys = {
            "type",
            "error_type",
            "code",
            "status",
            "step",
            "ts",
            "timestamp",
            "http_status",
            "retry",
            "detail",
            "reason",
        }

        sanitized: list[dict] = []
        inferred_error_type: Optional[str] = None

        for raw in events[:30]:
            if not isinstance(raw, dict):
                continue

            item: dict = {}
            for k, v in raw.items():
                key = str(k)
                lower = key.lower()
                # Жёстко вырезаем любые потенциальные поля с промптами/контентом
                if "prompt" in lower or "content" in lower or "text" in lower:
                    continue
                if key not in allowed_keys:
                    continue

                if isinstance(v, (int, float, bool)) or v is None:
                    item[key] = v
                else:
                    # Строки/объекты — в строку, ограничиваем длину
                    s = str(v)
                    item[key] = s[:240]

                if inferred_error_type is None and key in ("error_type", "type") and isinstance(v, str):
                    inferred_error_type = v[:100]

            if item:
                sanitized.append(item)

        if not sanitized:
            return inferred_error_type, None

        # Кладём только компактный JSON (без ASCII-экранирования), но ограничиваем общий размер
        try:
            import json as _json
            msg = _json.dumps(sanitized, ensure_ascii=False)
            return inferred_error_type, msg[:4000]
        except Exception:
            return inferred_error_type, None

    prompts_total = _safe_int(request.prompts_count, 0)
    errors_total = _safe_int(request.errors_count, 0)
    status = _status_from_counts(prompts_total, errors_total)

    error_type, error_message = _sanitize_events(request.events)
    if not error_type and errors_total > 0:
        error_type = "unknown"

    successful = max(0, prompts_total - errors_total)
    failed = max(0, errors_total)

    # Upsert по (user_id, session_id): чтобы не плодить 1000 записей при повторных send
    try:
        existing = (
            db.query(ExtensionLog)
            .filter(ExtensionLog.user_id == user.id, ExtensionLog.session_id == request.session_id)
            .order_by(ExtensionLog.timestamp.desc())
            .first()
        )

        if existing:
            existing.status = status
            existing.error_type = error_type
            existing.error_message = error_message or existing.error_message
            existing.prompts_count = prompts_total
            existing.successful_count = successful
            existing.failed_count = failed
            existing.duration_seconds = _safe_int(request.duration_seconds, 0)
        else:
            db.add(
                ExtensionLog(
                    user_id=user.id,
                    session_id=request.session_id,
                    status=status,
                    error_type=error_type,
                    error_message=error_message,
                    prompts_count=prompts_total,
                    successful_count=successful,
                    failed_count=failed,
                    duration_seconds=_safe_int(request.duration_seconds, 0),
                )
            )

        db.commit()
    except Exception:
        # Fail-open: логирование не должно ломать работу расширения
        try:
            db.rollback()
        except Exception:
            pass
    
    return LogUsageResponse(
        session_id=request.session_id,
        recorded=True,
        message="Usage logged successfully"
    )


# ==================== HEALTH CHECK ====================

@router.get("/health")
async def extension_health_check():
    """
    Ultra-fast health check для проверки доступности API.
    
    Используется расширением для graceful degradation.
    """
    return {"status": "ok", "timestamp": "2025-12-22T16:00:00Z"}

