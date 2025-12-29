"""
SQLAlchemy Models
Импортируем все models чтобы они зарегистрировались в Base
"""
from app.models.user import User
from app.models.subscription import Subscription
from app.models.license_key import LicenseKey
from app.models.transaction import Transaction
from app.models.extension_log import ExtensionLog
# === NEW MODELS ===
from app.models.promo_code import PromoCode
from app.models.credit_transaction import CreditTransaction, CreditTransactionType
from app.models.referral_config import ReferralConfig
from app.models.daily_analytics import DailyAnalytics

__all__ = [
    "User",
    "Subscription",
    "LicenseKey",
    "Transaction",
    "ExtensionLog",
    "PromoCode",
    "CreditTransaction",
    "CreditTransactionType",
    "ReferralConfig",
    "DailyAnalytics",
]
