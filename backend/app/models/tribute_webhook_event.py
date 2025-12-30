"""
TributeWebhookEvent - журнал всех входящих webhook событий от Tribute.

Зачем:
- мониторинг "дошли ли webhooks"
- диагностика причин 401/400/500
- понимание ретраев Tribute (5m/15m/30m/1h/10h) по повторяющимся событиям

Безопасность:
- raw_body может содержать PII (email и т.п.). Мы храним:
  - sha256 от raw_body (для точного сравнения)
  - raw_body (обрезанный), только для админского просмотра
"""

from sqlalchemy import Column, String, DateTime, Text, Integer
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4

from app.db.base import Base
from app.core.config import settings


if settings.USE_SQLITE:
    ID_TYPE = String(36)
    ID_DEFAULT = lambda: str(uuid4())
else:
    ID_TYPE = UUID(as_uuid=True)
    ID_DEFAULT = uuid4


class TributeWebhookEvent(Base):
    __tablename__ = "tribute_webhook_events"

    id = Column(ID_TYPE, primary_key=True, default=ID_DEFAULT)

    # Tribute envelope fields
    name = Column(String(64), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)

    # Extracted payload fields (best-effort)
    period_id = Column(String(64), nullable=True, index=True)
    payment_id = Column(String(64), nullable=True, index=True)
    telegram_user_id = Column(String(64), nullable=True, index=True)
    tribute_user_id = Column(String(64), nullable=True, index=True)
    currency = Column(String(16), nullable=True)
    amount = Column(Integer, nullable=True)  # cents as received (best-effort)

    # Signature + body fingerprint
    signature = Column(String(128), nullable=True)
    raw_body_sha256 = Column(String(64), nullable=False, index=True)
    raw_body = Column(Text, nullable=True)

    # Processing result
    status = Column(String(32), nullable=False, index=True)  # received|processed|already_processed|ignored|invalid_signature|error
    http_status = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)

    received_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    processed_at = Column(DateTime(timezone=True), nullable=True, index=True)


