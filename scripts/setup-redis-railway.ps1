# Setup Redis на Railway
# Автоматическая настройка Redis для backend сервиса

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Setup Redis на Railway" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Проверка Railway CLI
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Railway CLI не установлен!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Установите Railway CLI:" -ForegroundColor Yellow
    Write-Host "  npm install -g @railway/cli" -ForegroundColor White
    Write-Host "  или" -ForegroundColor White
    Write-Host "  brew install railway" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Railway CLI установлен" -ForegroundColor Green
Write-Host ""

# Проверка авторизации
Write-Host "Проверка авторизации в Railway..." -ForegroundColor Yellow
$loginCheck = railway whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Не авторизованы в Railway!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Выполните авторизацию:" -ForegroundColor Yellow
    Write-Host "  railway login" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Авторизован как: $loginCheck" -ForegroundColor Green
Write-Host ""

# Список проектов
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Доступные проекты:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
railway list

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Инструкции по настройке Redis" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Следуйте этим шагам в Railway Dashboard:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. Откройте ваш проект на Railway:" -ForegroundColor White
Write-Host "   https://railway.app/project/<your-project-id>" -ForegroundColor Gray
Write-Host ""

Write-Host "2. Добавьте Redis сервис:" -ForegroundColor White
Write-Host "   - Нажмите '+ New' в правом верхнем углу" -ForegroundColor Gray
Write-Host "   - Выберите 'Database' → 'Add Redis'" -ForegroundColor Gray
Write-Host "   - Дождитесь создания (займёт ~30 секунд)" -ForegroundColor Gray
Write-Host ""

Write-Host "3. Настройте переменную окружения для backend:" -ForegroundColor White
Write-Host "   - Откройте backend сервис" -ForegroundColor Gray
Write-Host "   - Перейдите во вкладку 'Variables'" -ForegroundColor Gray
Write-Host "   - Добавьте новую переменную:" -ForegroundColor Gray
Write-Host ""
Write-Host "     Имя:  REDIS_URL" -ForegroundColor Cyan
Write-Host "     Значение: " -NoNewline -ForegroundColor Cyan
Write-Host '${{Redis.REDIS_URL}}' -ForegroundColor Yellow
Write-Host ""
Write-Host "   - Сохраните (backend автоматически перезапустится)" -ForegroundColor Gray
Write-Host ""

Write-Host "4. Проверьте подключение:" -ForegroundColor White
Write-Host "   - Откройте 'Deployments' → 'View Logs'" -ForegroundColor Gray
Write-Host "   - Найдите строку: '✅ Redis connected'" -ForegroundColor Gray
Write-Host ""

Write-Host "5. Проверьте health endpoint:" -ForegroundColor White
Write-Host "   curl https://backend-production-40040.up.railway.app/health" -ForegroundColor Gray
Write-Host ""
Write-Host "   Ожидаемый ответ:" -ForegroundColor Gray
Write-Host '   {"status":"ok","services":{"database":"ok","redis":"ok"}}' -ForegroundColor Green
Write-Host ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Альтернатива: Внешний Redis" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Если Railway Redis недоступен, используйте внешний сервис:" -ForegroundColor Yellow
Write-Host ""

Write-Host "Вариант 1: Upstash (бесплатный tier)" -ForegroundColor White
Write-Host "  1. Зарегистрируйтесь на https://upstash.com" -ForegroundColor Gray
Write-Host "  2. Создайте Redis базу (регион: us-east)" -ForegroundColor Gray
Write-Host "  3. Скопируйте REDIS_URL" -ForegroundColor Gray
Write-Host "  4. Добавьте в Railway Variables: REDIS_URL=<ваш-url>" -ForegroundColor Gray
Write-Host ""

Write-Host "Вариант 2: Redis Cloud (бесплатный tier)" -ForegroundColor White
Write-Host "  1. Зарегистрируйтесь на https://redis.com/try-free" -ForegroundColor Gray
Write-Host "  2. Создайте базу (AWS us-east)" -ForegroundColor Gray
Write-Host "  3. Скопируйте connection string" -ForegroundColor Gray
Write-Host "  4. Добавьте в Railway Variables: REDIS_URL=<ваш-url>" -ForegroundColor Gray
Write-Host ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Проверка текущего статуса" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Проверка health endpoint
Write-Host "Проверка health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://backend-production-40040.up.railway.app/health" -Method Get -ErrorAction Stop
    
    Write-Host ""
    Write-Host "Статус сервисов:" -ForegroundColor White
    Write-Host "  Database: " -NoNewline -ForegroundColor White
    if ($response.services.database -eq "ok") {
        Write-Host "$($response.services.database)" -ForegroundColor Green
    } else {
        Write-Host "$($response.services.database)" -ForegroundColor Red
    }
    
    Write-Host "  Redis:    " -NoNewline -ForegroundColor White
    if ($response.services.redis -eq "ok") {
        Write-Host "$($response.services.redis)" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 Redis уже настроен и работает!" -ForegroundColor Green
    } elseif ($response.services.redis -like "*not configured*") {
        Write-Host "$($response.services.redis)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "⚠️  Redis не настроен. Следуйте инструкциям выше." -ForegroundColor Yellow
    } else {
        Write-Host "$($response.services.redis)" -ForegroundColor Red
        Write-Host ""
        Write-Host "❌ Redis настроен, но не подключается. Проверьте REDIS_URL." -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Не удалось проверить health endpoint" -ForegroundColor Red
    Write-Host "   Убедитесь что backend запущен на Railway" -ForegroundColor Gray
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Полезные команды" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Просмотр переменных окружения:" -ForegroundColor White
Write-Host "  railway variables" -ForegroundColor Gray
Write-Host ""
Write-Host "Просмотр логов backend:" -ForegroundColor White
Write-Host "  railway logs" -ForegroundColor Gray
Write-Host ""
Write-Host "Подключение к Redis CLI:" -ForegroundColor White
Write-Host "  railway connect redis" -ForegroundColor Gray
Write-Host ""
Write-Host "Рестарт сервиса:" -ForegroundColor White
Write-Host "  railway restart" -ForegroundColor Gray
Write-Host ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Дополнительная документация" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Подробное руководство:" -ForegroundColor White
Write-Host "  RAILWAY_REDIS_SETUP.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "Troubleshooting:" -ForegroundColor White
Write-Host "  См. раздел 'Типичные проблемы' в RAILWAY_REDIS_SETUP.md" -ForegroundColor Cyan
Write-Host ""

