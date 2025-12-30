"""
Тесты админского биллинга:
- можно получить конфиг (секрет не возвращается)
- можно обновить ссылки и секрет
"""

import pytest


@pytest.fixture
def admin_client(client, db):
    from app.models.user import User
    from app.core.security import get_password_hash

    admin = User(
        email="admin@example.com",
        password_hash=get_password_hash("AdminPassword123"),
        email_verified=True,
        is_active=True,
        is_admin=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    # login
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "AdminPassword123"},
    )
    token = r.json()["access_token"]
    client.headers = {"Authorization": f"Bearer {token}"}
    return client


def test_admin_billing_config_get_and_update(admin_client):
    # get initial
    r1 = admin_client.get("/api/v1/admin/billing/config")
    assert r1.status_code == 200
    body1 = r1.json()
    assert "tribute_webhook_secret_set" in body1
    assert "plans" in body1

    # update links + secret
    payload = {
        "payment_links": {
            "credit_500": "https://tribute.to/example?product=credit_500",
            "credit_2500": "https://tribute.to/example?product=credit_2500",
        },
        "tribute_webhook_secret": "super-secret-webhook",
    }
    r2 = admin_client.put("/api/v1/admin/billing/config", json=payload)
    assert r2.status_code == 200
    body2 = r2.json()
    assert body2["tribute_webhook_secret_set"] is True

    # secret must not be returned
    assert "tribute_webhook_secret" not in body2


def test_admin_webhook_selftest_and_verify(admin_client):
    # selftest should work and return valid signature/body pair (if secret is set in DB or env)
    # В этом тесте мы сначала выставим секрет через update config, затем проверим selftest/verify.
    payload = {
        "payment_links": {"credit_500": "https://tribute.to/example?product=credit_500"},
        "tribute_webhook_secret": "super-secret-webhook",
    }
    r_upd = admin_client.put("/api/v1/admin/billing/config", json=payload)
    assert r_upd.status_code == 200

    r1 = admin_client.post("/api/v1/admin/billing/webhook/selftest")
    assert r1.status_code == 200
    data = r1.json()
    assert "raw_body" in data and "signature" in data
    assert data["valid"] is True

    r2 = admin_client.post(
        "/api/v1/admin/billing/webhook/verify",
        json={"raw_body": data["raw_body"], "signature": data["signature"]},
    )
    assert r2.status_code == 200
    v = r2.json()
    assert v["valid"] is True


