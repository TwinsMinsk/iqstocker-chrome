# 🚀 IQStocker Chrome Auto - Backend

FastAPI backend для сервиса автоматизации Midjourney.

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
# Используя Poetry (рекомендуется)
poetry install

# Или используя pip
pip install -r requirements.txt
```

### 2. Настройка окружения

```bash
# Скопируйте .env.example в .env
cp .env.example .env

# Отредактируйте .env с вашими значениями
```

### 3. Запуск базы данных

```bash
# Используя Docker Compose (из корня проекта)
docker-compose up -d postgres redis
```

### 4. Применение миграций

```bash
alembic upgrade head
```

### 5. Запуск сервера

```bash
# Development mode
poetry run uvicorn app.main:app --reload

# Или
python -m uvicorn app.main:app --reload
```

Сервер будет доступен на: http://localhost:8000

API документация: http://localhost:8000/api/docs

## 📁 Структура проекта

```
backend/
├── app/
│   ├── core/          # Конфигурация и безопасность
│   ├── db/            # Database session
│   ├── models/        # SQLAlchemy models
│   ├── schemas/       # Pydantic schemas
│   ├── api/v1/        # API endpoints
│   ├── services/      # Business logic
│   ├── utils/         # Utilities
│   ├── middleware/    # FastAPI middleware
│   └── integrations/  # Third-party integrations
├── migrations/        # Alembic migrations
├── tests/             # Tests
└── requirements.txt
```

## 🧪 Тестирование

```bash
# Запуск всех тестов
pytest

# С coverage
pytest --cov=app --cov-report=html

# Конкретный тест
pytest tests/test_auth.py

# С verbose
pytest -v
```

## 📚 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Регистрация
- `POST /api/v1/auth/login` - Вход
- `POST /api/v1/auth/refresh` - Обновление токена
- `GET /api/v1/auth/me` - Текущий пользователь

### Billing
- `GET /api/v1/subscriptions/plans` - Список планов
- `POST /api/v1/subscriptions/purchase-plan` - Покупка плана
- `GET /api/v1/subscriptions/me` - Текущая подписка
- `GET /api/v1/subscriptions/transactions` - История транзакций

### Extensions
- `POST /api/v1/extensions/batch-validate` - Batch validation
- `POST /api/v1/extensions/finalize-session` - Финализация сессии
- `GET /api/v1/extensions/balance` - Баланс
- `GET /api/v1/extensions/health` - Health check

### Payments
- `POST /api/v1/payments/webhook/tribute` - Tribute webhook

## 📚 Документация

Полная документация находится в `../Docs/`:
- `API_SPECIFICATION.md` - API endpoints
- `DATABASE_SCHEMA.md` - Database schema
- `IMPLEMENTATION_GUIDE.md` - Пошаговое руководство

## 🔧 Переменные окружения

См. `.env.example` для полного списка переменных.

Основные:
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT secret key
- `REDIS_URL` - Redis connection string (опционально)
- `TRIBUTE_API_KEY` - Telegram Tribute API key
- `SENDGRID_API_KEY` - SendGrid API key для email
