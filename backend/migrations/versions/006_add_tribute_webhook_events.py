"""add_tribute_webhook_events

Revision ID: 006
Revises: 005
Create Date: 2025-12-30 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tribute_webhook_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("period_id", sa.String(64), nullable=True),
        sa.Column("payment_id", sa.String(64), nullable=True),
        sa.Column("telegram_user_id", sa.String(64), nullable=True),
        sa.Column("tribute_user_id", sa.String(64), nullable=True),
        sa.Column("currency", sa.String(16), nullable=True),
        sa.Column("amount", sa.Integer(), nullable=True),
        sa.Column("signature", sa.String(128), nullable=True),
        sa.Column("raw_body_sha256", sa.String(64), nullable=False),
        sa.Column("raw_body", sa.Text(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("http_status", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_index("ix_tribute_webhook_events_name", "tribute_webhook_events", ["name"])
    op.create_index("ix_tribute_webhook_events_period_id", "tribute_webhook_events", ["period_id"])
    op.create_index("ix_tribute_webhook_events_payment_id", "tribute_webhook_events", ["payment_id"])
    op.create_index("ix_tribute_webhook_events_telegram_user_id", "tribute_webhook_events", ["telegram_user_id"])
    op.create_index("ix_tribute_webhook_events_tribute_user_id", "tribute_webhook_events", ["tribute_user_id"])
    op.create_index("ix_tribute_webhook_events_raw_body_sha256", "tribute_webhook_events", ["raw_body_sha256"])
    op.create_index("ix_tribute_webhook_events_status", "tribute_webhook_events", ["status"])
    op.create_index("ix_tribute_webhook_events_received_at", "tribute_webhook_events", ["received_at"])
    op.create_index("ix_tribute_webhook_events_processed_at", "tribute_webhook_events", ["processed_at"])


def downgrade() -> None:
    op.drop_index("ix_tribute_webhook_events_processed_at", table_name="tribute_webhook_events")
    op.drop_index("ix_tribute_webhook_events_received_at", table_name="tribute_webhook_events")
    op.drop_index("ix_tribute_webhook_events_status", table_name="tribute_webhook_events")
    op.drop_index("ix_tribute_webhook_events_raw_body_sha256", table_name="tribute_webhook_events")
    op.drop_index("ix_tribute_webhook_events_tribute_user_id", table_name="tribute_webhook_events")
    op.drop_index("ix_tribute_webhook_events_telegram_user_id", table_name="tribute_webhook_events")
    op.drop_index("ix_tribute_webhook_events_payment_id", table_name="tribute_webhook_events")
    op.drop_index("ix_tribute_webhook_events_period_id", table_name="tribute_webhook_events")
    op.drop_index("ix_tribute_webhook_events_name", table_name="tribute_webhook_events")
    op.drop_table("tribute_webhook_events")


