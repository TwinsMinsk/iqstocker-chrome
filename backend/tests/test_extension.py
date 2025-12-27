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


class _FakeRedis:
    """
    Минимальный async Redis stub для тестов extension flow.

    Нам нужны только методы, которые используются ExtensionService:
    - get, setex, exists
    """

    def __init__(self):
        self._store = {}

    async def get(self, key: str):
        return self._store.get(key)

    async def setex(self, key: str, ttl_seconds: int, value: str):
        # TTL в тестах не симулируем — нам важнее семантика хранения
        self._store[key] = value
        return True

    async def exists(self, key: str):
        return 1 if key in self._store else 0


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


def test_finalize_session_deducts_missing_credits(client, user_with_license, db, monkeypatch):
    """
    SECURITY regression test:
    Если /deduct-credit не вызывался (или был заблокирован), finalize-session
    должен "досписать" кредиты по prompts_sent (но не больше prompts_count).
    """
    user, license_key, subscription = user_with_license
    start_balance = subscription.credits_balance

    # Подменяем Redis dependency на фейковый in-memory Redis
    fake_redis = _FakeRedis()
    from app.integrations.redis_client import get_redis_client
    from app.main import app
    app.dependency_overrides[get_redis_client] = lambda: fake_redis

    try:
        # 1) Старт сессии: batch-validate сохраняет session в Redis
        resp = client.post(
            "/api/v1/extensions/batch-validate",
            json={"license_key": license_key, "prompts_count": 5},
        )
        assert resp.status_code == status.HTTP_200_OK
        session_token = resp.json()["session_token"]

        # 2) Имитируем факт отправки 3 промптов, но deduct-credit НЕ вызываем
        fin = client.post(
            "/api/v1/extensions/finalize-session",
            json={"session_token": session_token, "prompts_sent": 3, "errors_count": 0},
        )
        assert fin.status_code == status.HTTP_200_OK
        data = fin.json()
        assert data["success"] is True
        assert data["credits_used"] == 3

        # 3) Проверяем баланс в БД
        sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
        assert sub.credits_balance == start_balance - 3
    finally:
        app.dependency_overrides.pop(get_redis_client, None)


def test_deduct_credit_rejects_out_of_range_index(client, user_with_license, db, monkeypatch):
    """prompt_index должен быть в диапазоне 0..prompts_count-1"""
    user, license_key, subscription = user_with_license

    fake_redis = _FakeRedis()
    from app.integrations.redis_client import get_redis_client
    from app.main import app
    app.dependency_overrides[get_redis_client] = lambda: fake_redis

    try:
        resp = client.post(
            "/api/v1/extensions/batch-validate",
            json={"license_key": license_key, "prompts_count": 2},
        )
        assert resp.status_code == status.HTTP_200_OK
        session_token = resp.json()["session_token"]

        bad = client.post(
            "/api/v1/extensions/deduct-credit",
            json={"session_token": session_token, "prompt_index": 999},
        )
        # Endpoint пробрасывает ошибку как 400
        assert bad.status_code == status.HTTP_400_BAD_REQUEST
    finally:
        app.dependency_overrides.pop(get_redis_client, None)

