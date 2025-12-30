"""
AppSettingsService - хранение/чтение админских настроек из БД.

Использование:
- Billing links для 4 тарифов
- TRIBUTE_WEBHOOK_SECRET (зашифрованный)

Правила безопасности:
- секрет никогда не возвращаем через API
- API может вернуть только флаг "secret_set"
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Dict

from sqlalchemy.orm import Session

from app.models.app_setting import AppSetting
from app.core.crypto import encrypt_secret, decrypt_secret


class AppSettingsKeys:
    TRIBUTE_WEBHOOK_SECRET = "billing.tribute.webhook_secret"

    @staticmethod
    def tribute_link(plan_id: str) -> str:
        return f"billing.tribute.link.{plan_id}"


class AppSettingsService:
    @staticmethod
    def set_value(db: Session, key: str, value: Optional[str], is_secret: bool) -> None:
        row = db.query(AppSetting).filter(AppSetting.key == key).first()
        if not row:
            row = AppSetting(key=key, value=None, is_secret=is_secret)
            db.add(row)

        row.is_secret = bool(is_secret)
        row.value = value
        db.flush()

    @staticmethod
    def get_value(db: Session, key: str) -> Optional[str]:
        row = db.query(AppSetting).filter(AppSetting.key == key).first()
        return row.value if row else None

    @staticmethod
    def set_tribute_webhook_secret(db: Session, secret: str) -> None:
        ciphertext = encrypt_secret(secret.strip())
        AppSettingsService.set_value(
            db=db,
            key=AppSettingsKeys.TRIBUTE_WEBHOOK_SECRET,
            value=ciphertext,
            is_secret=True,
        )

    @staticmethod
    def tribute_webhook_secret_is_set(db: Session) -> bool:
        v = AppSettingsService.get_value(db, AppSettingsKeys.TRIBUTE_WEBHOOK_SECRET)
        return bool(v)

    @staticmethod
    def get_tribute_webhook_secret_plaintext(db: Session) -> Optional[str]:
        row = db.query(AppSetting).filter(AppSetting.key == AppSettingsKeys.TRIBUTE_WEBHOOK_SECRET).first()
        if not row or not row.value:
            return None
        try:
            return decrypt_secret(row.value)
        except Exception:
            # Если SECRET_KEY поменяли и старые секреты не расшифровать — считаем невалидным.
            return None

    @staticmethod
    def set_plan_payment_link(db: Session, plan_id: str, url: str) -> None:
        AppSettingsService.set_value(
            db=db,
            key=AppSettingsKeys.tribute_link(plan_id),
            value=url.strip(),
            is_secret=False,
        )

    @staticmethod
    def get_plan_payment_link(db: Session, plan_id: str) -> Optional[str]:
        return AppSettingsService.get_value(db, AppSettingsKeys.tribute_link(plan_id))


app_settings_service = AppSettingsService()


