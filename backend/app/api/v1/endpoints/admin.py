"""
Admin endpoints
GET /admin/users, PATCH /admin/users/{id}, GET /admin/logs
"""
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List, Dict
from datetime import date, timedelta
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.api.v1.dependencies import get_current_admin_user
from app.models.user import User
from app.services.admin_service import admin_service
from app.core.config import settings
from app.schemas.admin import (
    AdminUserListResponse,
    AdminUserUpdateRequest,
    AdminUserUpdateResponse,
    AdminLogListResponse,
)
from app.services.promo_service import promo_service
from app.services.referral_service import referral_service
from app.services.billing_service import PLANS
from app.services.app_settings_service import app_settings_service
from app.models.transaction import Transaction
from sqlalchemy import desc

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
        is_admin=request.is_admin,
        admin_actor_id=str(admin_user.id),
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


# === PROMO MANAGEMENT ===

class CreatePromoRequest(BaseModel):
    code: str = Field(..., min_length=3, max_length=50)
    credit_amount: int = Field(..., gt=0)
    max_uses: Optional[int] = Field(None, gt=0)
    expires_at: Optional[str] = None
    description: Optional[str] = None


class PromoResponse(BaseModel):
    code: str
    credit_amount: int
    max_uses: Optional[int]
    current_uses: int
    expires_at: Optional[str]
    is_active: bool
    description: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


@router.get("/promocodes", response_model=List[PromoResponse])
async def list_promocodes(
    include_inactive: bool = Query(False),
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Получить список всех промокодов"""
    promos = promo_service.list_promos(db, include_inactive)
    return promos


@router.post("/promocodes", response_model=PromoResponse, status_code=status.HTTP_201_CREATED)
async def create_promocode(
    request: CreatePromoRequest,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Создать новый промокод"""
    from datetime import datetime
    
    expires_at = None
    if request.expires_at:
        try:
            expires_at = datetime.fromisoformat(request.expires_at.replace('Z', '+00:00'))
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid expires_at format. Use ISO 8601 format."
            )
    
    promo, error = promo_service.create_promo(
        db=db,
        code=request.code,
        credit_amount=request.credit_amount,
        max_uses=request.max_uses,
        expires_at=expires_at,
        description=request.description
    )
    
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
    
    return promo


@router.delete("/promocodes/{code}")
async def deactivate_promocode(
    code: str,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Деактивировать промокод"""
    success = promo_service.deactivate_promo(db, code)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Promo code not found")
    return {"message": "Promo code deactivated"}


# === REFERRAL CONFIG ===

class ReferralConfigResponse(BaseModel):
    tariff_plan_id: str
    plan_name: str
    reward_credits: int
    is_active: bool


class UpdateReferralConfigRequest(BaseModel):
    reward_credits: int = Field(..., ge=0)
    is_active: bool


@router.get("/referrals/config", response_model=List[ReferralConfigResponse])
async def get_referral_configs(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Получить настройки реферальных наград для всех тарифов"""
    configs = []
    for plan_id, plan_data in PLANS.items():
        config = referral_service.get_or_create_config(db, plan_id)
        configs.append(ReferralConfigResponse(
            tariff_plan_id=plan_id,
            plan_name=plan_data["name"],
            reward_credits=config.reward_credits,
            is_active=config.is_active
        ))
    return configs


@router.put("/referrals/config/{plan_id}", response_model=ReferralConfigResponse)
async def update_referral_config(
    plan_id: str,
    request: UpdateReferralConfigRequest,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Обновить настройки реферальной награды для тарифа"""
    if plan_id not in PLANS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    
    config = referral_service.update_config(
        db=db,
        plan_id=plan_id,
        reward_credits=request.reward_credits,
        is_active=request.is_active
    )
    
    return ReferralConfigResponse(
        tariff_plan_id=plan_id,
        plan_name=PLANS[plan_id]["name"],
        reward_credits=config.reward_credits,
        is_active=config.is_active
    )


# === ANALYTICS DASHBOARD ===

from app.services.analytics_service import analytics_service


class DashboardStatsResponse(BaseModel):
    """Статистика дашборда за период"""
    # Период
    period_start: date
    period_end: date
    
    # 1. Приток пользователей
    total_users: int  # Общее количество за все время
    new_users_month: int  # Новые пользователи за месяц
    growth_rate: float  # Темп роста (% к прошлому месяцу)
    
    # 2. Активные пользователи
    dau_count: int  # DAU (количество)
    dau_percentage: float  # DAU (% от общего числа)
    wau_count: int  # WAU (количество)
    wau_percentage: float  # WAU (% от общего числа)
    mau_count: int  # MAU (количество)
    mau_percentage: float  # MAU (% от общего числа)
    
    # 3. Платящие пользователи
    paying_users_month: int  # Количество платящих за месяц (уникальные)
    paying_users_percentage: float  # % платящих от общего количества за месяц
    
    # 4. Доход и средний чек
    total_revenue_eur: float  # Общая выручка за месяц
    average_check: float  # AOV (Average Order Value) за месяц
    ltv: float  # LTV (Lifetime Value) средний по платящим
    retention_rate: float  # Retention платящих (30 дней)
    
    # Дополнительные метрики
    total_generations: int
    new_referrals: int


@router.get("/analytics/dashboard", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    days: int = Query(30, ge=1, le=365),
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Получить полную статистику дашборда за период.
    
    Использует гибридный подход:
    - Быстрые метрики из DailyAnalytics
    - Сложные метрики (WAU/MAU/LTV/Retention) считаются через AnalyticsService
    """
    end_date = date.today()
    start_date = end_date - timedelta(days=days)
    
    # Получаем все метрики через AnalyticsService
    stats = analytics_service.get_comprehensive_stats(db, start_date, end_date)
    
    return DashboardStatsResponse(**stats)


# === BILLING SETTINGS (PAYMENT LINKS + TRIBUTE SECRET) ===

class BillingPlanConfig(BaseModel):
    plan_id: str
    plan_name: str
    credits: int
    payment_link: Optional[str] = None


class BillingConfigResponse(BaseModel):
    tribute_webhook_secret_set: bool
    plans: List[BillingPlanConfig]


class BillingConfigUpdateRequest(BaseModel):
    # plan_id -> url
    payment_links: Dict[str, str] = Field(default_factory=dict)
    # если прислали, обновляем (в ответе не возвращаем)
    tribute_webhook_secret: Optional[str] = Field(default=None, min_length=8)


@router.get("/billing/config", response_model=BillingConfigResponse)
async def get_billing_config(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    plans: List[BillingPlanConfig] = []
    for plan_id, plan in PLANS.items():
        link = app_settings_service.get_plan_payment_link(db, plan_id) or plan.get("tribute_link")
        plans.append(
            BillingPlanConfig(
                plan_id=plan_id,
                plan_name=str(plan.get("name", plan_id)),
                credits=int(plan.get("credits", 0)),
                payment_link=link,
            )
        )

    return BillingConfigResponse(
        tribute_webhook_secret_set=bool(settings.TRIBUTE_WEBHOOK_SECRET) or app_settings_service.tribute_webhook_secret_is_set(db),
        plans=plans,
    )


@router.put("/billing/config", response_model=BillingConfigResponse)
async def update_billing_config(
    request: BillingConfigUpdateRequest,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    # 1) payment links
    for plan_id, url in request.payment_links.items():
        if plan_id not in PLANS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown plan_id: {plan_id}")
        if not url or not (url.startswith("https://") or url.startswith("http://")):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid URL for {plan_id}")
        app_settings_service.set_plan_payment_link(db, plan_id, url)

    # 2) secret (НЕ возвращаем обратно)
    if request.tribute_webhook_secret:
        app_settings_service.set_tribute_webhook_secret(db, request.tribute_webhook_secret)

    db.commit()
    return await get_billing_config(admin_user=admin_user, db=db)


# === BILLING TRANSACTIONS VIEW ===

class AdminTransactionItem(BaseModel):
    id: str
    user_id: str
    payment_id: Optional[str]
    plan_id: Optional[str]
    amount: float
    credits: int
    status: str
    created_at: str
    completed_at: Optional[str]


class AdminTransactionListResponse(BaseModel):
    total: int
    transactions: List[AdminTransactionItem]


@router.get("/billing/transactions", response_model=AdminTransactionListResponse)
async def list_transactions(
    limit: int = Query(50, ge=1, le=200),
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    q = db.query(Transaction).order_by(desc(Transaction.created_at))
    total = q.count()
    rows = q.limit(limit).all()

    return AdminTransactionListResponse(
        total=total,
        transactions=[
            AdminTransactionItem(
                id=str(t.id),
                user_id=str(t.user_id),
                payment_id=t.payment_id,
                plan_id=t.plan_id,
                amount=float(t.amount),
                credits=int(t.credits),
                status=str(t.status),
                created_at=t.created_at.isoformat() if t.created_at else "",
                completed_at=t.completed_at.isoformat() if t.completed_at else None,
            )
            for t in rows
        ],
    )


# === WEBHOOK VERIFICATION TOOLS (ADMIN) ===

class WebhookVerifyRequest(BaseModel):
    # ВАЖНО: подпись вычисляется по "сырым" байтам body. Поэтому тут принимаем raw_body.
    raw_body: str = Field(..., min_length=2, description="Точное тело запроса (как пришло на сервер), строкой")
    signature: str = Field(..., min_length=16, description="Значение заголовка trbt-signature")


class WebhookVerifyResponse(BaseModel):
    valid: bool
    secret_source: str  # env|db|missing
    parsed_event_name: Optional[str] = None


@router.post("/billing/webhook/verify", response_model=WebhookVerifyResponse)
async def verify_tribute_webhook_signature(
    request: WebhookVerifyRequest,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Проверка подписи Tribute webhook (админ-инструмент).

    Tribute подписывает HMAC-SHA256 от request body и кладёт в `trbt-signature`.
    Док: https://wiki.tribute.tg/for-content-creators/api-documentation/webhooks
    """
    from app.services.payment_service import PaymentService
    from app.services.app_settings_service import app_settings_service

    secret = None
    secret_source = "missing"
    if settings.TRIBUTE_WEBHOOK_SECRET:
        secret = settings.TRIBUTE_WEBHOOK_SECRET
        secret_source = "env"
    else:
        secret = app_settings_service.get_tribute_webhook_secret_plaintext(db)
        if secret:
            secret_source = "db"

    raw_bytes = request.raw_body.encode("utf-8")
    valid = PaymentService.verify_tribute_signature(raw_bytes, request.signature, secret)

    # Опционально: попробуем распарсить event_name из тела (для UX)
    parsed_event_name = None
    try:
        import json as _json
        data = _json.loads(request.raw_body)
        if isinstance(data, dict):
            parsed_event_name = data.get("name")
    except Exception:
        pass

    return WebhookVerifyResponse(valid=bool(valid), secret_source=secret_source, parsed_event_name=parsed_event_name)


class WebhookSelftestResponse(BaseModel):
    raw_body: str
    signature: str
    valid: bool
    secret_source: str


@router.post("/billing/webhook/selftest", response_model=WebhookSelftestResponse)
async def tribute_webhook_selftest(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Генерирует тестовый payload и подпись так, как ожидает Tribute:
    - raw_body: компактный JSON
    - signature: HMAC-SHA256 hex

    Позволяет быстро проверить, что:
    - секрет задан (env или db)
    - алгоритм проверки корректный

    Док: https://wiki.tribute.tg/for-content-creators/api-documentation/webhooks
    """
    import json
    import hmac
    import hashlib
    from app.services.payment_service import PaymentService
    from app.services.app_settings_service import app_settings_service

    secret = None
    secret_source = "missing"
    if settings.TRIBUTE_WEBHOOK_SECRET:
        secret = settings.TRIBUTE_WEBHOOK_SECRET
        secret_source = "env"
    else:
        secret = app_settings_service.get_tribute_webhook_secret_plaintext(db)
        if secret:
            secret_source = "db"

    # Сборка минимального валидного payload по доке Tribute (event new_subscription).
    # ВАЖНО: Tribute действительно шлёт такие поля: name/created_at/sent_at/payload.*
    # (см. примеры в документации)
    sample = {
        "name": "new_subscription",
        "created_at": "2025-01-01T00:00:00Z",
        "sent_at": "2025-01-01T00:00:01Z",
        "payload": {
            "subscription_name": "Test",
            "subscription_id": 1,
            "period_id": 2,
            "period": "monthly",
            "amount": 1000,
            "currency": "eur",
            "telegram_user_id": 123456789,
        },
    }

    raw_body = json.dumps(sample, separators=(",", ":"), ensure_ascii=False)
    raw_bytes = raw_body.encode("utf-8")

    signature = ""
    if secret:
        signature = hmac.new(secret.encode(), raw_bytes, hashlib.sha256).hexdigest()

    valid = PaymentService.verify_tribute_signature(raw_bytes, signature, secret)
    return WebhookSelftestResponse(
        raw_body=raw_body,
        signature=signature,
        valid=bool(valid),
        secret_source=secret_source,
    )


class AdminWebhookEventItem(BaseModel):
    id: str
    received_at: str
    processed_at: Optional[str]
    name: Optional[str]
    period_id: Optional[str]
    telegram_user_id: Optional[str]
    tribute_user_id: Optional[str]
    status: str
    http_status: Optional[int]
    error_message: Optional[str]
    raw_body_sha256: str


class AdminWebhookEventListResponse(BaseModel):
    total: int
    events: List[AdminWebhookEventItem]


@router.get("/billing/webhook/events", response_model=AdminWebhookEventListResponse)
async def list_tribute_webhook_events(
    limit: int = Query(50, ge=1, le=200),
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Последние webhook события Tribute (для диагностики)"""
    from app.models.tribute_webhook_event import TributeWebhookEvent

    q = db.query(TributeWebhookEvent).order_by(desc(TributeWebhookEvent.received_at))
    total = q.count()
    rows = q.limit(limit).all()

    return AdminWebhookEventListResponse(
        total=total,
        events=[
            AdminWebhookEventItem(
                id=str(e.id),
                received_at=e.received_at.isoformat() if e.received_at else "",
                processed_at=e.processed_at.isoformat() if e.processed_at else None,
                name=e.name,
                period_id=e.period_id,
                telegram_user_id=e.telegram_user_id,
                tribute_user_id=e.tribute_user_id,
                status=e.status,
                http_status=e.http_status,
                error_message=(e.error_message[:300] if e.error_message else None),
                raw_body_sha256=e.raw_body_sha256,
            )
            for e in rows
        ],
    )

