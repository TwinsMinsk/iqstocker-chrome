"""add_email_to_tribute_webhook_events

Revision ID: 007
Revises: 006
Create Date: 2025-01-20 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Добавляем поле email для логирования email из shop_order webhook
    op.add_column(
        "tribute_webhook_events",
        sa.Column("email", sa.String(255), nullable=True)
    )
    
    # Создаем индекс для быстрого поиска по email
    op.create_index(
        "ix_tribute_webhook_events_email",
        "tribute_webhook_events",
        ["email"]
    )


def downgrade() -> None:
    op.drop_index("ix_tribute_webhook_events_email", table_name="tribute_webhook_events")
    op.drop_column("tribute_webhook_events", "email")
