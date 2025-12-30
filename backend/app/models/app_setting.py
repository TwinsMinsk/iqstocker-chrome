"""
AppSetting - хранение админских настроек в БД.

Используем для:
- payment links (не секрет)
- TRIBUTE_WEBHOOK_SECRET (секрет, хранится ЗАШИФРОВАННЫМ)

Важно:
- Мы НЕ возвращаем секрет в API. Только "установлен/не установлен".
"""

from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.sql import func

from app.db.base import Base


class AppSetting(Base):
    __tablename__ = "app_settings"

    # Ключ (например "billing.tribute.link.credit_500" или "billing.tribute.webhook_secret")
    key = Column(String(255), primary_key=True)

    # Значение (для секретов: ciphertext base64)
    value = Column(Text, nullable=True)

    # Признак секрета (чтобы не отдавать наружу и хранить зашифрованно)
    is_secret = Column(Boolean, nullable=False, server_default="false")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<AppSetting(key={self.key}, is_secret={self.is_secret})>"


