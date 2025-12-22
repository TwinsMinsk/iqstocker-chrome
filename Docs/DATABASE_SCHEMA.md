# 🗄️ DATABASE SCHEMA & INITIALIZATION
## PostgreSQL Tables for Midjourney Auto

**Database:** PostgreSQL 15+  
**ORM:** SQLAlchemy 2.0  
**Migrations:** Alembic  

---

## 📊 TABLE DEFINITIONS

### 1. USERS TABLE

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    oauth_google_id VARCHAR(255) UNIQUE,
    
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    email_verified_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT users_email_check CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    INDEX idx_users_email (email),
    INDEX idx_users_created_at (created_at),
    INDEX idx_users_is_active (is_active)
);
```

**SQLAlchemy Model:**
```python
class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    oauth_google_id = Column(String(255), unique=True)
    
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    email_verification_token = Column(String(255))
    email_verified_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True))
    
    # Relationships
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    license_keys = relationship("LicenseKey", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    extension_logs = relationship("ExtensionLog", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(email={self.email}, id={self.id})>"
```

---

### 2. SUBSCRIPTIONS TABLE

```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    plan_id VARCHAR(50) NOT NULL, -- 'free', 'basic', 'standard', 'pro'
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'cancelled'
    
    credits_balance INTEGER DEFAULT 0,
    monthly_limit INTEGER,
    used_this_month INTEGER DEFAULT 0,
    
    subscription_starts_at TIMESTAMP,
    subscription_expires_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT subscriptions_credits_check CHECK (credits_balance >= 0),
    CONSTRAINT subscriptions_used_check CHECK (used_this_month >= 0),
    INDEX idx_subscriptions_user_id (user_id),
    INDEX idx_subscriptions_status (status),
    INDEX idx_subscriptions_expires_at (subscription_expires_at)
);
```

**SQLAlchemy Model:**
```python
class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    plan_id = Column(String(50), nullable=False)  # 'free', 'basic', 'standard', 'pro'
    status = Column(String(50), default="active")  # 'active', 'expired', 'cancelled'
    
    credits_balance = Column(Integer, default=0)
    monthly_limit = Column(Integer)
    used_this_month = Column(Integer, default=0)
    
    subscription_starts_at = Column(DateTime(timezone=True))
    subscription_expires_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="subscriptions")
    
    def is_expired(self) -> bool:
        if self.subscription_expires_at is None:
            return False
        return datetime.utcnow() > self.subscription_expires_at
```

---

### 3. LICENSE_KEYS TABLE

```sql
CREATE TABLE license_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    key_hash VARCHAR(255) UNIQUE NOT NULL, -- bcrypt hashed
    key_display VARCHAR(50) NOT NULL, -- 'sk_live_...' for UI
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    revoked_at TIMESTAMP,
    
    INDEX idx_license_keys_user_id (user_id),
    INDEX idx_license_keys_key_hash (key_hash),
    INDEX idx_license_keys_is_active (is_active)
);
```

**SQLAlchemy Model:**
```python
class LicenseKey(Base):
    __tablename__ = "license_keys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    key_hash = Column(String(255), unique=True, nullable=False, index=True)
    key_display = Column(String(50), nullable=False)  # 'sk_live_a1b2c3d4...'
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used_at = Column(DateTime(timezone=True))
    revoked_at = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="license_keys")
```

---

### 4. TRANSACTIONS TABLE

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    amount DECIMAL(10, 2) NOT NULL,
    credits INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'purchase', 'refund', 'usage'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    
    payment_id VARCHAR(255), -- From Tribute
    plan_id VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    CONSTRAINT transactions_amount_check CHECK (amount > 0),
    CONSTRAINT transactions_credits_check CHECK (credits > 0),
    INDEX idx_transactions_user_id (user_id),
    INDEX idx_transactions_status (status),
    INDEX idx_transactions_created_at (created_at)
);
```

**SQLAlchemy Model:**
```python
class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    amount = Column(DECIMAL(10, 2), nullable=False)
    credits = Column(Integer, nullable=False)
    type = Column(String(50), nullable=False)  # 'purchase', 'refund', 'usage'
    status = Column(String(50), default="pending")
    
    payment_id = Column(String(255))  # From Tribute
    plan_id = Column(String(50))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="transactions")
```

---

### 5. EXTENSION_LOGS TABLE (METADATA ONLY!)

```sql
CREATE TABLE extension_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    session_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'success', 'error', 'paused', 'completed'
    
    error_type VARCHAR(100), -- 'rate_limit', 'invalid_prompt', 'network_error', 'discord_error'
    error_message TEXT, -- Error details, NOT PROMPT TEXT!
    
    prompts_count INTEGER DEFAULT 0,
    successful_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    duration_seconds INTEGER,
    
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- NOTE: NO prompt_text column! Metadata only!
    
    INDEX idx_extension_logs_user_id (user_id),
    INDEX idx_extension_logs_session_id (session_id),
    INDEX idx_extension_logs_status (status),
    INDEX idx_extension_logs_timestamp (timestamp)
);
```

**SQLAlchemy Model:**
```python
class ExtensionLog(Base):
    __tablename__ = "extension_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    session_id = Column(String(255), nullable=False, index=True)
    status = Column(String(50), nullable=False, index=True)  # 'success', 'error', 'paused', 'completed'
    
    error_type = Column(String(100))  # 'rate_limit', 'invalid_prompt', 'network_error'
    error_message = Column(Text)  # Error details only, NOT prompts!
    
    prompts_count = Column(Integer, default=0)
    successful_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    duration_seconds = Column(Integer)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    user = relationship("User", back_populates="extension_logs")
```

---

## 🔧 INITIALIZATION SCRIPT

### alembic/versions/001_init_schema.py

```python
"""Create initial schema

Revision ID: 001
Revises: 
Create Date: 2025-12-22 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create extension for UUID
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    
    # Users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.func.uuid_generate_v4()),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('oauth_google_id', sa.String(255)),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('is_admin', sa.Boolean(), server_default='false'),
        sa.Column('email_verified', sa.Boolean(), server_default='false'),
        sa.Column('email_verification_token', sa.String(255)),
        sa.Column('email_verified_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime(timezone=True)),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('oauth_google_id'),
    )
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_created_at', 'users', ['created_at'])
    
    # Subscriptions table
    op.create_table(
        'subscriptions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('plan_id', sa.String(50), nullable=False),
        sa.Column('status', sa.String(50), server_default='active'),
        sa.Column('credits_balance', sa.Integer(), server_default='0'),
        sa.Column('monthly_limit', sa.Integer()),
        sa.Column('used_this_month', sa.Integer(), server_default='0'),
        sa.Column('subscription_starts_at', sa.DateTime(timezone=True)),
        sa.Column('subscription_expires_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_subscriptions_user_id', 'subscriptions', ['user_id'])
    op.create_index('idx_subscriptions_status', 'subscriptions', ['status'])
    op.create_index('idx_subscriptions_expires_at', 'subscriptions', ['subscription_expires_at'])
    
    # License Keys table
    op.create_table(
        'license_keys',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('key_hash', sa.String(255), nullable=False),
        sa.Column('key_display', sa.String(50), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('last_used_at', sa.DateTime(timezone=True)),
        sa.Column('revoked_at', sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key_hash'),
    )
    op.create_index('idx_license_keys_user_id', 'license_keys', ['user_id'])
    op.create_index('idx_license_keys_key_hash', 'license_keys', ['key_hash'])
    
    # Transactions table
    op.create_table(
        'transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('amount', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('credits', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('status', sa.String(50), server_default='pending'),
        sa.Column('payment_id', sa.String(255)),
        sa.Column('plan_id', sa.String(50)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_transactions_user_id', 'transactions', ['user_id'])
    op.create_index('idx_transactions_status', 'transactions', ['status'])
    op.create_index('idx_transactions_created_at', 'transactions', ['created_at'])
    
    # Extension Logs table
    op.create_table(
        'extension_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('session_id', sa.String(255), nullable=False),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('error_type', sa.String(100)),
        sa.Column('error_message', sa.Text),
        sa.Column('prompts_count', sa.Integer(), server_default='0'),
        sa.Column('successful_count', sa.Integer(), server_default='0'),
        sa.Column('failed_count', sa.Integer(), server_default='0'),
        sa.Column('duration_seconds', sa.Integer()),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
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
```

---

## 📈 DATABASE PERFORMANCE

### Indexes Created
```
- users(email) - for login lookups
- users(created_at) - for analytics
- subscriptions(user_id, status) - for user queries
- subscriptions(expires_at) - for expiry checks
- license_keys(key_hash) - for key validation
- transactions(user_id, created_at) - for payment history
- extension_logs(user_id, timestamp) - for user logs
- extension_logs(status) - for error tracking
```

### Query Examples

**Get user profile:**
```sql
SELECT u.*, s.*, lk.* 
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN license_keys lk ON u.id = lk.user_id AND lk.is_active = true
WHERE u.id = $1;
```

**Get payment history:**
```sql
SELECT * FROM transactions 
WHERE user_id = $1 AND created_at > NOW() - INTERVAL '90 days'
ORDER BY created_at DESC
LIMIT 20;
```

**Get extension logs:**
```sql
SELECT * FROM extension_logs
WHERE user_id = $1
  AND timestamp > NOW() - INTERVAL '30 days'
  AND status IN ('error', 'paused')
ORDER BY timestamp DESC
LIMIT 100;
```

---

## 🔐 SECURITY MEASURES

1. **Password Hashing:** bcrypt with salt rounds = 12
2. **License Key Hashing:** bcrypt (key_hash column)
3. **Sensitive Data:** Never stored in logs (use key_display instead)
4. **Soft Deletes:** deleted_at column for audit trail
5. **Foreign Keys:** ON DELETE CASCADE for data integrity
6. **Check Constraints:** credits_balance >= 0, amount > 0

---

## 📦 BACKUP & RECOVERY

```bash
# Backup
pg_dump midjourney_auto > backup.sql

# Restore
psql midjourney_auto < backup.sql

# Railway auto-backup (daily, 7-day retention)
# Configured in Railway dashboard
```

---

**Created:** December 22, 2025  
**Version:** 1.0  
**Last Updated:** December 22, 2025