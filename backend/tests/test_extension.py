"""
Тесты для extension endpoints
"""
import pytest
from fastapi import status
from app.models.user import User
from app.models.subscription import Subscription
from app.models.license_key import LicenseKey
from app.core.security import get_password_hash, generate_license_key


@pytest.fixture
def user_with_license(db):
    """Создать пользователя с лицензией и подпиской"""
    user = User(
        email="license@example.com",
        password_hash=get_password_hash("Password123"),
        email_verified=True,
        is_active=True
    )
    db.add(user)
    db.flush()
    
    subscription = Subscription(
        user_id=user.id,
        plan_id="standard",
        status="active",
        credits_balance=5000
    )
    db.add(subscription)
    db.flush()
    
    license_key_display = generate_license_key()
    license_key = LicenseKey(
        user_id=user.id,
        key_hash=get_password_hash(license_key_display),
        key_display=license_key_display,
        is_active=True
    )
    db.add(license_key)
    db.commit()
    db.refresh(user)
    
    return user, license_key_display, subscription


def test_validate_key_success(client, user_with_license):
    """Тест успешной валидации ключа"""
    user, license_key, subscription = user_with_license
    
    response = client.post(
        "/api/v1/extensions/validate-key",
        json={"key": license_key}
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["valid"] is True
    assert data["user_id"] == str(user.id)
    assert data["balance"] == subscription.credits_balance


def test_validate_key_invalid(client):
    """Тест валидации неверного ключа"""
    response = client.post(
        "/api/v1/extensions/validate-key",
        json={"key": "sk_live_invalid_key_12345"}
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["valid"] is False


def test_batch_validate_success(client, user_with_license):
    """Тест batch validation"""
    user, license_key, subscription = user_with_license
    
    response = client.post(
        "/api/v1/extensions/batch-validate",
        json={
            "license_key": license_key,
            "prompts_count": 10
        }
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["allowed"] is True
    assert "session_token" in data
    assert "config" in data


def test_batch_validate_insufficient_credits(client, user_with_license, db):
    """Тест batch validation с недостаточным балансом"""
    user, license_key, subscription = user_with_license
    
    # Установить баланс меньше чем нужно
    subscription.credits_balance = 5
    db.merge(subscription)
    db.commit()
    
    response = client.post(
        "/api/v1/extensions/batch-validate",
        json={
            "license_key": license_key,
            "prompts_count": 10
        }
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["allowed"] is False
    assert "insufficient_credits" in data.get("error", "")


def test_get_balance(client, user_with_license):
    """Тест получения баланса"""
    user, license_key, subscription = user_with_license
    
    response = client.get(
        "/api/v1/extensions/balance",
        headers={"X-License-Key": license_key}
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["balance"] == subscription.credits_balance
    assert "used_this_month" in data


def test_health_check(client):
    """Тест health check endpoint"""
    response = client.get("/api/v1/extensions/health")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "ok"

