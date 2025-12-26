# Скрипт для генерации секретных ключей для Railway деплоя
# Запустите этот скрипт в PowerShell

# Установка кодировки UTF-8 для корректного отображения
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Получение пути к директории скрипта
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "🔑 Генерация секретных ключей для Railway деплоя" -ForegroundColor Green
Write-Host ""

# Функция генерации случайной hex строки
function New-HexKey {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    return ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
}

Write-Host "Ключ 1 (SECRET_KEY для Backend):" -ForegroundColor Yellow
$key1 = New-HexKey
Write-Host $key1 -ForegroundColor Cyan
Write-Host ""

Write-Host "Ключ 2 (SESSION_TOKEN_SECRET для Backend):" -ForegroundColor Yellow
$key2 = New-HexKey
Write-Host $key2 -ForegroundColor Cyan
Write-Host ""

Write-Host "Ключ 3 (NEXTAUTH_SECRET для Frontend):" -ForegroundColor Yellow
$key3 = New-HexKey
Write-Host $key3 -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Все ключи сгенерированы!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Скопируйте эти ключи и используйте их при настройке переменных окружения в Railway:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Backend Variables:" -ForegroundColor Magenta
Write-Host "  SECRET_KEY = $key1"
Write-Host "  SESSION_TOKEN_SECRET = $key2"
Write-Host ""
Write-Host "Frontend Variables:" -ForegroundColor Magenta
Write-Host "  NEXTAUTH_SECRET = $key3"
Write-Host ""

# Сохранить в файл
$keys = @"
# Секретные ключи для Railway деплоя
# Сгенерировано: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Backend
SECRET_KEY=$key1
SESSION_TOKEN_SECRET=$key2

# Frontend
NEXTAUTH_SECRET=$key3
"@

$keys | Out-File -FilePath "railway_keys.txt" -Encoding UTF8
Write-Host "💾 Ключи также сохранены в файл: railway_keys.txt" -ForegroundColor Green
Write-Host "⚠️  ВАЖНО: Не коммитьте этот файл в Git!" -ForegroundColor Red

