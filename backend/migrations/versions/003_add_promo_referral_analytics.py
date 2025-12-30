"""add_promo_referral_analytics

Revision ID: 003
Revises: 002
Create Date: 2025-12-29 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # === 1. Обновление таблицы users ===
    op.add_column('users', sa.Column('referral_code', sa.String(12), nullable=True))
    op.add_column('users', sa.Column('referred_by_id', postgresql.UUID(as_uuid=True), nullable=True))
    
    op.create_index('ix_users_referral_code', 'users', ['referral_code'], unique=True)
    op.create_index('ix_users_referred_by_id', 'users', ['referred_by_id'])
    
    op.create_foreign_key(
        'fk_users_referred_by_id', 
        'users', 'users', 
        ['referred_by_id'], ['id'], 
        ondelete='SET NULL'
    )
    
    # === 2. Таблица promo_codes ===
    op.create_table(
        'promo_codes',
        sa.Column('code', sa.String(50), primary_key=True),
        sa.Column('credit_amount', sa.Integer(), nullable=False),
        sa.Column('max_uses', sa.Integer(), nullable=True),
        sa.Column('current_uses', sa.Integer(), server_default='0', nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('credit_amount > 0', name='promo_credit_positive'),
        sa.CheckConstraint('current_uses >= 0', name='promo_uses_non_negative'),
    )
    op.create_index('ix_promo_codes_code', 'promo_codes', ['code'])
    
    # === 3. Таблица credit_transactions ===
    op.create_table(
        'credit_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('related_entity_id', sa.String(255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('balance_after', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_credit_transactions_user_id', 'credit_transactions', ['user_id'])
    op.create_index('ix_credit_transactions_type', 'credit_transactions', ['type'])
    op.create_index('ix_credit_transactions_created_at', 'credit_transactions', ['created_at'])
    
    # === 4. Таблица referral_configs ===
    op.create_table(
        'referral_configs',
        sa.Column('tariff_plan_id', sa.String(50), primary_key=True),
        sa.Column('reward_credits', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    
    # === 5. Таблица daily_analytics ===
    op.create_table(
        'daily_analytics',
        sa.Column('date', sa.Date(), primary_key=True),
        sa.Column('new_users_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('active_users_dau', sa.Integer(), server_default='0', nullable=False),
        sa.Column('revenue_eur', sa.Numeric(12, 2), server_default='0', nullable=False),
        sa.Column('paying_users_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('total_generations', sa.Integer(), server_default='0', nullable=False),
        sa.Column('total_prompts', sa.Integer(), server_default='0', nullable=False),
        sa.Column('new_referrals_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('referral_rewards_paid', sa.Integer(), server_default='0', nullable=False),
    )


def downgrade() -> None:
    op.drop_table('daily_analytics')
    op.drop_table('referral_configs')
    op.drop_index('ix_credit_transactions_created_at', 'credit_transactions')
    op.drop_index('ix_credit_transactions_type', 'credit_transactions')
    op.drop_index('ix_credit_transactions_user_id', 'credit_transactions')
    op.drop_table('credit_transactions')
    op.drop_index('ix_promo_codes_code', 'promo_codes')
    op.drop_table('promo_codes')
    op.drop_constraint('fk_users_referred_by_id', 'users', type_='foreignkey')
    op.drop_index('ix_users_referred_by_id', 'users')
    op.drop_index('ix_users_referral_code', 'users')
    op.drop_column('users', 'referred_by_id')
    op.drop_column('users', 'referral_code')

