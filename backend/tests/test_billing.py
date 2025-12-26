"""
Тесты для billing и подписок
"""
import pytest
from fastapi import status


def test_get_plans(client):
    """Тест получения списка планов"""
    response = client.get("/api/v1/subscriptions/plans")
    
    assert response.status_code == status.HTTP_200_OK
    plans = response.json()
    assert isinstance(plans, list)
    assert len(plans) > 0
    
    # Проверить структуру плана
    plan = plans[0]
    assert "id" in plan
    assert "name" in plan
    assert "price_eur" in plan
    assert "credits" in plan


def test_purchase_plan(authenticated_client):
    """Тест покупки плана"""
    response = authenticated_client.post(
        "/api/v1/subscriptions/purchase-plan",
        json={"plan_id": "credit_500"}
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "payment_id" in data
    assert "payment_url" in data
    assert "plan" in data
    assert data["plan"] == "500 Credits"


def test_purchase_invalid_plan(authenticated_client):
    """Тест покупки несуществующего плана"""
    response = authenticated_client.post(
        "/api/v1/subscriptions/purchase-plan",
        json={"plan_id": "plan_invalid"}
    )
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_get_my_subscription(authenticated_client, test_user, db):
    """Тест получения подписки пользователя"""
    # Создать подписку для тестового пользователя
    from app.models.subscription import Subscription
    
    subscription = Subscription(
        user_id=test_user.id,
        plan_id="free",
        status="active",
        credits_balance=50
    )
    db.add(subscription)
    db.commit()
    
    response = authenticated_client.get("/api/v1/subscriptions/me")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["plan_id"] == "free"
    assert data["credits_balance"] == 50


def test_get_transactions(authenticated_client, test_user, db):
    """Тест получения транзакций"""
    from app.models.transaction import Transaction
    from decimal import Decimal
    
    # Создать транзакцию
    transaction = Transaction(
        user_id=test_user.id,
        amount=Decimal("10.00"),
        credits=5000,
        type="purchase",
        status="completed",
        plan_id="plan_standard"
    )
    db.add(transaction)
    db.commit()
    
    response = authenticated_client.get("/api/v1/subscriptions/transactions")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "transactions" in data
    assert "total" in data
    assert len(data["transactions"]) > 0

