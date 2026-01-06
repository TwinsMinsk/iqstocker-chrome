# Скрипт для запуска миграций базы данных
# Использование: .\run_migration.ps1

Write-Host "🔄 Running database migrations..." -ForegroundColor Cyan

# Переходим в директорию скрипта
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Проверяем наличие Poetry
if (-not (Get-Command poetry -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Poetry не найден. Установите Poetry: https://python-poetry.org/docs/#installation" -ForegroundColor Red
    exit 1
}

# Проверяем наличие alembic.ini
if (-not (Test-Path "alembic.ini")) {
    Write-Host "❌ Файл alembic.ini не найден в текущей директории" -ForegroundColor Red
    exit 1
}

# Запускаем миграции
Write-Host "📦 Запуск миграций через Poetry..." -ForegroundColor Yellow
poetry run alembic upgrade head

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Миграции успешно применены!" -ForegroundColor Green
} else {
    Write-Host "❌ Ошибка при применении миграций" -ForegroundColor Red
    exit $LASTEXITCODE
}
