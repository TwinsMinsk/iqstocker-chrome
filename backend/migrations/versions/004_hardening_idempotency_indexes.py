"""hardening_idempotency_indexes

Revision ID: 004
Revises: 003
Create Date: 2025-12-30 00:00:00.000000

Цели миграции:
- Устранить риск падения миграций/схемы из-за отсутствия pgcrypto (gen_random_uuid()).
- Добавить настоящую идемпотентность на уровне БД:
  - уникальность payment_id в transactions (когда payment_id задан)
  - уникальность (user_id, type, related_entity_id) в credit_transactions для защиты от дублей
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic
revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) UUID генерация: gen_random_uuid() относится к расширению pgcrypto.
    # В существующей миграции 001 включали uuid-ossp, но default'ы используют gen_random_uuid.
    # Добавляем pgcrypto (safe, idempotent).
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    # 2) Идемпотентность платежей: payment_id должен быть уникален, если он задан.
    # Для PostgreSQL делаем partial unique index, чтобы NULL не мешали.
    op.create_index(
        "uq_transactions_payment_id_not_null",
        "transactions",
        ["payment_id"],
        unique=True,
        postgresql_where=sa.text("payment_id IS NOT NULL"),
    )

    # 3) Идемпотентность кредитных событий:
    # - purchase: (user_id, type, related_entity_id=payment_id)
    # - promo_code: (user_id, type, related_entity_id=promo_code)
    # - referral_reward: (user_id, type, related_entity_id=payment_id)
    #
    # related_entity_id может быть NULL (manual adjustments/usage/etc) — для них не хотим uniqueness.
    op.create_index(
        "uq_credit_transactions_user_type_entity_not_null",
        "credit_transactions",
        ["user_id", "type", "related_entity_id"],
        unique=True,
        postgresql_where=sa.text("related_entity_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_credit_transactions_user_type_entity_not_null", table_name="credit_transactions")
    op.drop_index("uq_transactions_payment_id_not_null", table_name="transactions")
    # pgcrypto можно не удалять — это расширение может использоваться и другими объектами.


