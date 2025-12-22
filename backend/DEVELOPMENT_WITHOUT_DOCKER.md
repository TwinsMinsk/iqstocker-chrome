# 🚀 Разработка БЕЗ Docker

Этот гайд поможет вам разрабатывать проект без Docker Desktop.

## 📋 Варианты работы с базой данных

### Вариант 1: SQLite (Самый простой) ✅ РЕКОМЕНДУЕТСЯ

**Преимущества:**
- Не требует установки
- Работает сразу
- Идеально для разработки

**Настройка:**

1. Откройте `backend/app/core/config.py`
2. Измените:
   ```python
   USE_SQLITE: bool = True
   ```

3. Запустите миграции:
   ```bash
   cd backend
   alembic upgrade head
   ```

4. Готово! SQLite файл создастся автоматически в `backend/iqstocker.db`

**⚠️ Ограничения SQLite:**
- Некоторые функции PostgreSQL недоступны (gen_random_uuid, некоторые типы)
- Нужно будет адаптировать миграции для SQLite
- Для production всё равно нужен PostgreSQL

---

### Вариант 2: Облачный PostgreSQL (Railway/Supabase)

**Преимущества:**
- Настоящий PostgreSQL
- Не требует локальной установки
- Можно использовать для production

#### Railway PostgreSQL:

1. Создайте аккаунт на https://railway.app
2. Создайте новый проект → Add PostgreSQL
3. Скопируйте `DATABASE_URL` из Railway
4. Вставьте в `.env`:
   ```
   DATABASE_URL=postgresql://user:pass@host:port/dbname
   ```

#### Supabase (бесплатный):

1. Создайте проект на https://supabase.com
2. Settings → Database → Connection string
3. Скопируйте `DATABASE_URL`
4. Вставьте в `.env`

---

### Вариант 3: Локальный PostgreSQL (если установлен)

Если у вас установлен PostgreSQL локально:

1. Создайте базу данных:
   ```sql
   CREATE DATABASE iqstocker_auto;
   ```

2. В `.env` укажите:
   ```
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/iqstocker_auto
   ```

---

## 🔧 Настройка для SQLite

Если используете SQLite, нужно адаптировать миграции:

### 1. Создайте адаптированную миграцию для SQLite

Создайте файл `backend/migrations/versions/001_init_schema_sqlite.py`:

```python
"""Create initial schema (SQLite version)

Revision ID: 001_sqlite
Revises: 
Create Date: 2025-12-22

"""
from alembic import op
import sqlalchemy as sa

revision = '001_sqlite'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(36), nullable=False),  # UUID как строка для SQLite
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('oauth_google_id', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('is_admin', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('email_verified', sa.Boolean(), server_default='0', nullable=False),
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
    
    # Остальные таблицы аналогично...
    # (см. полный пример ниже)


def downgrade() -> None:
    op.drop_table('users')
    # ...
```

### 2. Или используйте автоматическое определение

SQLAlchemy может работать с SQLite, но нужно адаптировать models для использования String вместо UUID.

**Быстрое решение:** Используйте облачный PostgreSQL (Railway/Supabase) - это проще!

---

## 🚀 Быстрый старт БЕЗ Docker

### Шаг 1: Установите зависимости

```bash
cd backend
pip install -r requirements.txt
```

### Шаг 2: Настройте .env

Создайте `backend/.env`:

```bash
# Для SQLite
USE_SQLITE=true
DATABASE_URL=sqlite:///./iqstocker.db

# Или для облачного PostgreSQL (Railway/Supabase)
# USE_SQLITE=false
# DATABASE_URL=postgresql://user:pass@host:port/dbname

# Остальные настройки
SECRET_KEY=your-secret-key-here
DEBUG=true
ENVIRONMENT=development
```

### Шаг 3: Запустите сервер

```bash
cd backend
python -m uvicorn app.main:app --reload
```

Сервер запустится на http://localhost:8000

---

## ⚠️ Redis (опционально)

Redis используется для кэширования и rate limiting. На начальном этапе можно обойтись без него:

1. В коде добавьте проверку:
   ```python
   if settings.REDIS_URL:
       # Использовать Redis
   else:
       # Fallback на in-memory cache
   ```

2. Или используйте облачный Redis:
   - Railway Redis
   - Upstash (бесплатный tier)
   - Redis Cloud

---

## 📝 Рекомендации

**Для разработки:**
- ✅ Используйте SQLite (быстро, просто)
- ✅ Или облачный PostgreSQL (Railway/Supabase)

**Для production:**
- ✅ Обязательно PostgreSQL на Railway
- ✅ Redis на Railway или Upstash

---

**Готово! Теперь можно разрабатывать без Docker! 🎉**

