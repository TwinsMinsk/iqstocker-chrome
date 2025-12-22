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
```

## 📚 Документация

Полная документация находится в `../Docs/`:
- `API_SPECIFICATION.md` - API endpoints
- `DATABASE_SCHEMA.md` - Database schema
- `IMPLEMENTATION_GUIDE.md` - Пошаговое руководство

