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
    # monkeypatch автоматически обновит settings во всех модулях, которые его импортировали
    from app.core.config import settings
    monkeypatch.setattr(settings, "TRIBUTE_WEBHOOK_SECRET", tribute_webhook_secret)
    
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
            "user_id": 9999,
            "telegram_user_id": 123456789,
            "channel_id": 100,
            "channel_name": "midjourney_auto",
            "expires_at": "2026-01-22T10:00:00Z"
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
    from app.core.config import settings
    monkeypatch.setattr(settings, "TRIBUTE_WEBHOOK_SECRET", tribute_webhook_secret)
    
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
    from app.core.config import settings
    monkeypatch.setattr(settings, "TRIBUTE_WEBHOOK_SECRET", tribute_webhook_secret)
    
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
            "user_id": 9999,
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

