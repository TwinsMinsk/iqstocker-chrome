"""
Критические тесты для реферальной системы и промокодов:
- referral reward: идемпотентность (дважды за один payment_id начислить нельзя)
- promo redeem: повторная активация одним пользователем запрещена

Тесты работают на SQLite (см. conftest.py), поэтому в них важно избегать PostgreSQL-only фич.
"""

import pytest


def _create_user_with_subscription(db, email: str):
    from app.models.user import User
    from app.models.subscription import Subscription

    user = User(email=email, password_hash="x", email_verified=True, is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)

    sub = Subscription(user_id=user.id, plan_id="free", status="active", credits_balance=0)
    db.add(sub)
    db.commit()
    return user


def test_referral_reward_is_idempotent(db):
    from app.models.referral_config import ReferralConfig
    from app.services.referral_service import referral_service
    from app.models.subscription import Subscription

    referrer = _create_user_with_subscription(db, "referrer@example.com")
    payer = _create_user_with_subscription(db, "payer@example.com")

    payer.referred_by_id = referrer.id
    db.commit()

    cfg = ReferralConfig(tariff_plan_id="credit_500", reward_credits=25, is_active=True)
    db.add(cfg)
    db.commit()

    reward1, err1 = referral_service.process_referral_reward(
        db=db,
        payer_user_id=str(payer.id),
        plan_id="credit_500",
        payment_id="pay_123",
    )
    assert err1 is None
    assert reward1 == 25

    # Повторный вызов с тем же payment_id должен быть no-op
    reward2, err2 = referral_service.process_referral_reward(
        db=db,
        payer_user_id=str(payer.id),
        plan_id="credit_500",
        payment_id="pay_123",
    )
    assert err2 is None
    assert reward2 is None

    db.commit()

    sub = db.query(Subscription).filter(Subscription.user_id == referrer.id).first()
    assert sub is not None
    assert int(sub.credits_balance) == 25


def test_promo_redeem_twice_blocked(db):
    from app.models.promo_code import PromoCode
    from app.services.promo_service import promo_service
    from app.models.subscription import Subscription

    user = _create_user_with_subscription(db, "promo@example.com")

    promo = PromoCode(code="WELCOME", credit_amount=10, max_uses=None, current_uses=0, is_active=True)
    db.add(promo)
    db.commit()

    credits1, err1 = promo_service.redeem_promo(db=db, user_id=str(user.id), code="WELCOME")
    assert err1 is None
    assert credits1 == 10

    credits2, err2 = promo_service.redeem_promo(db=db, user_id=str(user.id), code="WELCOME")
    assert credits2 is None
    assert err2 in ("Вы уже использовали этот промокод", "duplicate_transaction")

    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    assert int(sub.credits_balance) == 10


