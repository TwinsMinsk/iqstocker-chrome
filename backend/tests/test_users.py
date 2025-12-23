"""
Тесты для user endpoints
"""
import pytest
from fastapi import status


def test_get_my_profile(authenticated_client, test_user, db):
    """Тест получения профиля пользователя"""
    from app.models.subscription import Subscription
    from app.models.license_key import LicenseKey
    from app.core.security import get_password_hash, generate_license_key
    
    # Создать подписку
    subscription = Subscription(
        user_id=test_user.id,
        plan_id="standard",
        status="active",
        credits_balance=5000
    )
    db.add(subscription)
    db.flush()
    
    # Создать лицензионный ключ
    key_display = generate_license_key()
    license_key = LicenseKey(
        user_id=test_user.id,
        key_hash=get_password_hash(key_display),
        key_display=key_display,
        is_active=True
    )
    db.add(license_key)
    db.commit()
    
    response = authenticated_client.get("/api/v1/users/me")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == str(test_user.id)
    assert data["email"] == test_user.email
    assert "balance" in data
    assert "subscription" in data
    assert "license_key" in data
    assert data["balance"]["credits"] == 5000


def test_update_email(authenticated_client, test_user, db):
    """Тест обновления email"""
    new_email = "newemail@example.com"
    
    response = authenticated_client.patch(
        "/api/v1/users/me",
        json={"email": new_email}
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == new_email
    
    # Проверить, что email_verified сброшен
    db.refresh(test_user)
    assert test_user.email_verified is False


def test_update_email_duplicate(authenticated_client, db):
    """Тест обновления email на существующий"""
    from app.models.user import User
    from app.core.security import get_password_hash
    
    # Создать другого пользователя
    other_user = User(
        email="other@example.com",
        password_hash=get_password_hash("Password123"),
        email_verified=True
    )
    db.add(other_user)
    db.commit()
    
    # Попытаться обновить email на существующий
    response = authenticated_client.patch(
        "/api/v1/users/me",
        json={"email": "other@example.com"}
    )
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_change_password(authenticated_client, test_user, test_user_data):
    """Тест смены пароля"""
    response = authenticated_client.patch(
        "/api/v1/users/me/password",
        json={
            "old_password": test_user_data["password"],
            "new_password": "NewPassword456"
        }
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True
    
    # Проверить, что новый пароль работает
    login_response = authenticated_client.post(
        "/api/v1/auth/login",
        json={
            "email": test_user_data["email"],
            "password": "NewPassword456"
        }
    )
    assert login_response.status_code == status.HTTP_200_OK


def test_change_password_invalid_old(authenticated_client, test_user_data):
    """Тест смены пароля с неверным старым паролем"""
    response = authenticated_client.patch(
        "/api/v1/users/me/password",
        json={
            "old_password": "WrongPassword123",
            "new_password": "NewPassword456"
        }
    )
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_generate_license_key(authenticated_client, test_user, db):
    """Тест генерации нового лицензионного ключа"""
    response = authenticated_client.post("/api/v1/users/me/license-keys")
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert "id" in data
    assert "display" in data
    assert data["display"].startswith("sk_live_")
    assert data["active"] is True


def test_revoke_license_key(authenticated_client, test_user, db):
    """Тест отзыва лицензионного ключа"""
    from app.models.license_key import LicenseKey
    from app.core.security import get_password_hash, generate_license_key
    
    # Создать ключ
    key_display = generate_license_key()
    license_key = LicenseKey(
        user_id=test_user.id,
        key_hash=get_password_hash(key_display),
        key_display=key_display,
        is_active=True
    )
    db.add(license_key)
    db.commit()
    db.refresh(license_key)
    
    # Отозвать ключ
    response = authenticated_client.delete(
        f"/api/v1/users/me/license-keys/{license_key.id}"
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True
    
    # Проверить, что ключ деактивирован
    db.refresh(license_key)
    assert license_key.is_active is False
    assert license_key.revoked_at is not None

