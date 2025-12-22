"""Create initial schema

Revision ID: 001
Revises: 
Create Date: 2025-12-22 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create extension for UUID (PostgreSQL 15+ использует gen_random_uuid, но uuid-ossp для совместимости)
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    
    # Users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('oauth_google_id', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_admin', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('email_verified', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('email_verification_token', sa.String(255), nullable=True),
        sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('oauth_google_id'),
    )
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_created_at', 'users', ['created_at'])
    
    # Subscriptions table
    op.create_table(
        'subscriptions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('plan_id', sa.String(50), nullable=False),
        sa.Column('status', sa.String(50), server_default='active', nullable=False),
        sa.Column('credits_balance', sa.Integer(), server_default='0', nullable=False),
        sa.Column('monthly_limit', sa.Integer(), nullable=True),
        sa.Column('used_this_month', sa.Integer(), server_default='0', nullable=False),
        sa.Column('subscription_starts_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('subscription_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('credits_balance >= 0', name='subscriptions_credits_check'),
        sa.CheckConstraint('used_this_month >= 0', name='subscriptions_used_check'),
    )
    op.create_index('idx_subscriptions_user_id', 'subscriptions', ['user_id'])
    op.create_index('idx_subscriptions_status', 'subscriptions', ['status'])
    op.create_index('idx_subscriptions_expires_at', 'subscriptions', ['subscription_expires_at'])
    
    # License Keys table
    op.create_table(
        'license_keys',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('key_hash', sa.String(255), nullable=False),
        sa.Column('key_display', sa.String(50), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key_hash'),
    )
    op.create_index('idx_license_keys_user_id', 'license_keys', ['user_id'])
    op.create_index('idx_license_keys_key_hash', 'license_keys', ['key_hash'])
    op.create_index('idx_license_keys_is_active', 'license_keys', ['is_active'])
    
    # Transactions table
    op.create_table(
        'transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('credits', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('status', sa.String(50), server_default='pending', nullable=False),
        sa.Column('payment_id', sa.String(255), nullable=True),
        sa.Column('plan_id', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('amount > 0', name='transactions_amount_check'),
        sa.CheckConstraint('credits > 0', name='transactions_credits_check'),
    )
    op.create_index('idx_transactions_user_id', 'transactions', ['user_id'])
    op.create_index('idx_transactions_status', 'transactions', ['status'])
    op.create_index('idx_transactions_created_at', 'transactions', ['created_at'])
    
    # Extension Logs table (ВАЖНО: БЕЗ текстов промптов!)
    op.create_table(
        'extension_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('session_id', sa.String(255), nullable=False),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('error_type', sa.String(100), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('prompts_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('successful_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('failed_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_extension_logs_user_id', 'extension_logs', ['user_id'])
    op.create_index('idx_extension_logs_session_id', 'extension_logs', ['session_id'])
    op.create_index('idx_extension_logs_status', 'extension_logs', ['status'])
    op.create_index('idx_extension_logs_timestamp', 'extension_logs', ['timestamp'])


def downgrade() -> None:
    op.drop_index('idx_extension_logs_timestamp', 'extension_logs')
    op.drop_index('idx_extension_logs_status', 'extension_logs')
    op.drop_index('idx_extension_logs_session_id', 'extension_logs')
    op.drop_index('idx_extension_logs_user_id', 'extension_logs')
    op.drop_table('extension_logs')
    
    op.drop_index('idx_transactions_created_at', 'transactions')
    op.drop_index('idx_transactions_status', 'transactions')
    op.drop_index('idx_transactions_user_id', 'transactions')
    op.drop_table('transactions')
    
    op.drop_index('idx_license_keys_is_active', 'license_keys')
    op.drop_index('idx_license_keys_key_hash', 'license_keys')
    op.drop_index('idx_license_keys_user_id', 'license_keys')
    op.drop_table('license_keys')
    
    op.drop_index('idx_subscriptions_expires_at', 'subscriptions')
    op.drop_index('idx_subscriptions_status', 'subscriptions')
    op.drop_index('idx_subscriptions_user_id', 'subscriptions')
    op.drop_table('subscriptions')
    
    op.drop_index('idx_users_created_at', 'users')
    op.drop_index('idx_users_email', 'users')
    op.drop_table('users')

