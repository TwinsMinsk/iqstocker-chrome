"""Add telegram_user_id to users

Revision ID: 002
Revises: 001
Create Date: 2025-12-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Добавляем колонку telegram_user_id в таблицу users
    op.add_column(
        'users',
        sa.Column('telegram_user_id', sa.String(255), nullable=True)
    )
    
    # Создаем уникальный индекс для telegram_user_id
    op.create_index(
        'idx_users_telegram_user_id',
        'users',
        ['telegram_user_id'],
        unique=True
    )
    
    # Создаем unique constraint
    op.create_unique_constraint(
        'uq_users_telegram_user_id',
        'users',
        ['telegram_user_id']
    )


def downgrade() -> None:
    # Удаляем constraint
    op.drop_constraint('uq_users_telegram_user_id', 'users', type_='unique')
    
    # Удаляем индекс
    op.drop_index('idx_users_telegram_user_id', 'users')
    
    # Удаляем колонку
    op.drop_column('users', 'telegram_user_id')

