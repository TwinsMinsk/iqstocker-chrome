"""
Тесты для payment webhooks
"""
import pytest
import hmac
import hashlib
import json
from fastapi import status


@pytest.fixture
def tribute_webhook_secret():
    """Секрет для подписи webhook"""
    return "test-webhook-secret"


def test_tribute_webhook_new_subscription(client, db, tribute_webhook_secret, monkeypatch):
    """Тест обработки webhook новой подписки от Tribute"""
    # ВАЖНО: Устанавливаем секрет в настройках
    # Нужно обновить settings в обоих местах, так как они могут быть кэшированы
    from app.core.config import settings, get_settings
    import app.services.payment_service
    from app.models.user import User
    
    # Очищаем кэш settings
    get_settings.cache_clear()
    
    # Устанавливаем секрет
    monkeypatch.setattr(settings, "TRIBUTE_WEBHOOK_SECRET", tribute_webhook_secret)
    # Также обновляем в payment_service, если он уже импортирован
    if hasattr(app.services.payment_service, 'settings'):
        monkeypatch.setattr(app.services.payment_service.settings, "TRIBUTE_WEBHOOK_SECRET", tribute_webhook_secret)
    
    # Создаем тестового пользователя с telegram_user_id
    test_user = User(
        email="test@example.com",
        password_hash="test_hash",
        telegram_user_id="123456789",
        email_verified=True,
        is_active=True
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)
    
    # Данные webhook
    webhook_data = {
        "name": "new_subscription",
        "created_at": "2025-12-22T10:00:00Z",
        "sent_at": "2025-12-22T10:00:01Z",
        "payload": {
            "subscription_name": "STANDARD Plan",
            "subscription_id": 1234,
            "period_id": 5678,
            "period": "monthly",
            "price": 1000,  # в центах
            "amount": 1000,
            "currency": "eur",
            "user_id": str(test_user.id),  # Используем реальный ID пользователя
            "telegram_user_id": 123456789,
            "channel_id": 100,
            "channel_name": "midjourney_auto",
            "expires_at": "2026-01-22T10:00:00Z",
            "custom_data": {
                "user_id": str(test_user.id)  # Добавляем user_id в custom_data для поиска
            }
        }
    }
    
    # ВАЖНО: Создаем сырое тело запроса и подпись ДО отправки
    # Используем json.dumps с sort_keys=True для детерминированного порядка
    body_bytes = json.dumps(webhook_data, sort_keys=True).encode('utf-8')
    signature = hmac.new(
        tribute_webhook_secret.encode(),
        body_bytes,
        hashlib.sha256
    ).hexdigest()
    
    # ВАЖНО: Используем content= вместо json= чтобы отправить точное тело запроса
    # которое мы использовали для создания подписи
    response = client.post(
        "/api/v1/payments/webhook/tribute",
        content=body_bytes,
        headers={
            "trbt-signature": signature,
            "Content-Type": "application/json"
        }
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "ok"


def test_tribute_webhook_invalid_signature(client, tribute_webhook_secret, monkeypatch):
    """Тест webhook с неверной подписью"""
    # ВАЖНО: Устанавливаем секрет в настройках
    from app.core.config import settings, get_settings
    import app.services.payment_service
    
    # Очищаем кэш settings
    get_settings.cache_clear()
    
    # Устанавливаем секрет
    monkeypatch.setattr(settings, "TRIBUTE_WEBHOOK_SECRET", tribute_webhook_secret)
    # Также обновляем в payment_service, если он уже импортирован
    if hasattr(app.services.payment_service, 'settings'):
        monkeypatch.setattr(app.services.payment_service.settings, "TRIBUTE_WEBHOOK_SECRET", tribute_webhook_secret)
    
    webhook_data = {
        "name": "new_subscription",
        "payload": {}
    }
    
    # ВАЖНО: Создаем правильное тело запроса, но используем неверную подпись
    body_bytes = json.dumps(webhook_data, sort_keys=True).encode('utf-8')
    
    # Неверная подпись
    response = client.post(
        "/api/v1/payments/webhook/tribute",
        content=body_bytes,
        headers={
            "trbt-signature": "invalid-signature",
            "Content-Type": "application/json"
        }
    )
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_tribute_webhook_cancelled_subscription(client, db, tribute_webhook_secret, monkeypatch):
    """Тест обработки отмены подписки"""
    # ВАЖНО: Устанавливаем секрет в настройках
    from app.core.config import settings, get_settings
    import app.services.payment_service
    from app.models.user import User
    from app.models.subscription import Subscription
    
    # Очищаем кэш settings
    get_settings.cache_clear()
    
    # Устанавливаем секрет
    monkeypatch.setattr(settings, "TRIBUTE_WEBHOOK_SECRET", tribute_webhook_secret)
    # Также обновляем в payment_service, если он уже импортирован
    if hasattr(app.services.payment_service, 'settings'):
        monkeypatch.setattr(app.services.payment_service.settings, "TRIBUTE_WEBHOOK_SECRET", tribute_webhook_secret)
    
    # Создаем тестового пользователя с telegram_user_id
    test_user = User(
        email="test_cancel@example.com",
        password_hash="test_hash",
        telegram_user_id="123456789",
        email_verified=True,
        is_active=True
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)
    
    # Создаем активную подписку для пользователя
    subscription = Subscription(
        user_id=test_user.id,
        plan_id="credit_1000",
        status="active",
        credits_balance=100
    )
    db.add(subscription)
    db.commit()
    
    webhook_data = {
        "name": "cancelled_subscription",
        "created_at": "2025-12-22T10:00:00Z",
        "sent_at": "2025-12-22T10:00:01Z",
        "payload": {
            "subscription_name": "STANDARD Plan",
            "subscription_id": 1234,
            "period_id": 5678,
            "period": "monthly",
            "price": 1000,
            "amount": 1000,
            "currency": "eur",
            "user_id": str(test_user.id),  # Используем реальный ID пользователя
            "telegram_user_id": 123456789,
            "channel_id": 100,
            "channel_name": "midjourney_auto",
            "cancel_reason": "",
            "expires_at": "2025-12-22T10:00:00Z"
        }
    }
    
    # ВАЖНО: Создаем сырое тело запроса с детерминированным порядком ключей
    body_bytes = json.dumps(webhook_data, sort_keys=True).encode('utf-8')
    signature = hmac.new(
        tribute_webhook_secret.encode(),
        body_bytes,
        hashlib.sha256
    ).hexdigest()
    
    response = client.post(
        "/api/v1/payments/webhook/tribute",
        content=body_bytes,
        headers={
            "trbt-signature": signature,
            "Content-Type": "application/json"
        }
    )
    
    assert response.status_code == status.HTTP_200_OK

