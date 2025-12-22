"""
SQLAlchemy Models
Импортируем все models чтобы они зарегистрировались в Base
"""
from app.models.user import User
from app.models.subscription import Subscription
from app.models.license_key import LicenseKey
from app.models.transaction import Transaction
from app.models.extension_log import ExtensionLog

__all__ = [
    "User",
    "Subscription",
    "LicenseKey",
    "Transaction",
    "ExtensionLog",
]
