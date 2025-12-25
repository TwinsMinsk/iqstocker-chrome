#!/bin/bash
# Главный скрипт деплоя для production

set -e

echo "🚀 Starting IQStocker deployment..."

# Проверяем наличие .env файлов
if [ ! -f backend/.env ]; then
    echo "❌ backend/.env не найден! Скопируйте backend/env.example в backend/.env"
    exit 1
fi

if [ ! -f frontend/.env ]; then
    echo "❌ frontend/.env не найден! Скопируйте frontend/env.example в frontend/.env"
    exit 1
fi

# Останавливаем старые контейнеры
echo "🛑 Stopping old containers..."
docker-compose -f docker-compose.prod.yml down

# Создаем бэкап базы данных (если контейнер БД запущен)
if [ "$(docker ps -q -f name=iqstocker-postgres)" ]; then
    echo "💾 Creating database backup..."
    docker exec iqstocker-postgres pg_dump -U postgres iqstocker_db > "./backup/backup_$(date +%Y%m%d_%H%M%S).sql"
fi

# Собираем новые образы
echo "🔨 Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Запускаем контейнеры
echo "🚀 Starting containers..."
docker-compose -f docker-compose.prod.yml up -d

# Ждем запуска базы данных
echo "⏳ Waiting for database..."
sleep 10

# Запускаем миграции
echo "🔄 Running migrations..."
docker exec iqstocker-backend poetry run alembic upgrade head

# Проверяем статус
echo "🔍 Checking service health..."
sleep 5

# Health check для backend
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "⚠️ Backend health check failed"
fi

# Health check для frontend
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Frontend is healthy"
else
    echo "⚠️ Frontend health check failed"
fi

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📊 Service URLs:"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:8000"
echo "  API Docs: http://localhost:8000/api/docs"
echo ""
echo "📝 View logs:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"

