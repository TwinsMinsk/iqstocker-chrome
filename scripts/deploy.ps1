# PowerShell скрипт деплоя для Windows
# Главный скрипт деплоя для production

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting IQStocker deployment..." -ForegroundColor Green

# Проверяем наличие .env файлов
if (-not (Test-Path "backend\.env")) {
    Write-Host "❌ backend\.env не найден! Скопируйте backend\env.example в backend\.env" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "frontend\.env")) {
    Write-Host "❌ frontend\.env не найден! Скопируйте frontend\env.example в frontend\.env" -ForegroundColor Red
    exit 1
}

# Останавливаем старые контейнеры
Write-Host "🛑 Stopping old containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml down

# Создаем бэкап базы данных (если контейнер БД запущен)
$postgresContainer = docker ps -q -f name=iqstocker-postgres
if ($postgresContainer) {
    Write-Host "💾 Creating database backup..." -ForegroundColor Yellow
    $backupDir = ".\backup"
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir | Out-Null
    }
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    docker exec iqstocker-postgres pg_dump -U postgres iqstocker_db > "$backupDir\backup_$timestamp.sql"
}

# Собираем новые образы
Write-Host "🔨 Building Docker images..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml build --no-cache

# Запускаем контейнеры
Write-Host "🚀 Starting containers..." -ForegroundColor Green
docker-compose -f docker-compose.prod.yml up -d

# Ждем запуска базы данных
Write-Host "⏳ Waiting for database..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Запускаем миграции
Write-Host "🔄 Running migrations..." -ForegroundColor Yellow
docker exec iqstocker-backend poetry run alembic upgrade head

# Проверяем статус
Write-Host "🔍 Checking service health..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Health check для backend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Backend is healthy" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Backend health check failed" -ForegroundColor Red
}

# Health check для frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Frontend is healthy" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Frontend health check failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Service URLs:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000"
Write-Host "  Backend API: http://localhost:8000"
Write-Host "  API Docs: http://localhost:8000/api/docs"
Write-Host ""
Write-Host "📝 View logs:" -ForegroundColor Cyan
Write-Host "  docker-compose -f docker-compose.prod.yml logs -f"

