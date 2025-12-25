#!/bin/bash
# Скрипт для запуска миграций базы данных

set -e  # Остановить при ошибке

echo "🔄 Running database migrations..."

# Переходим в директорию backend
cd "$(dirname "$0")/.."

# Проверяем наличие alembic
if ! command -v alembic &> /dev/null; then
    echo "❌ Alembic не найден. Установите зависимости: poetry install"
    exit 1
fi

# Запускаем миграции
poetry run alembic upgrade head

echo "✅ Migrations completed successfully!"

