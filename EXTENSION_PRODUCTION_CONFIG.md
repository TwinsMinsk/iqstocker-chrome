# Настройка расширения для Production

## ✅ Что было исправлено

### 1. API URL настроен на Production Railway
- **Файл:** `extension/src/constants/config.ts`
- **Production URL:** `https://backend-production-40040.up.railway.app/api/v1`
- **Fallback:** Если API недоступен, расширение использует кэш (5 минут)

### 2. Permissions обновлены в manifest.json
- **Файл:** `extension/src/manifest.json`
- **Добавлено:**
  - `https://backend-production-40040.up.railway.app/*` (production API)
  - `http://localhost:8000/*` (для локальной разработки)

### 3. UI показывает текущий API
- В popup расширения добавлена секция "Настройки"
- Отображается текущий API endpoint
- Пользователь видит, что расширение работает с production

### 4. Версия обновлена
- **Текущая версия:** `1.0.3`
- **Дата сборки:** автоматически при упаковке
- **Файлы:**
  - `frontend/public/downloads/extension/latest.zip`
  - `frontend/public/downloads/extension/latest.json`

## 📋 Как установить обновлённое расширение

### Вариант 1: Скачать с сайта (после деплоя)
1. Откройте `https://your-frontend.railway.app/dashboard`
2. Нажмите "Скачать ZIP" (версия 1.0.3)
3. Распакуйте архив
4. Откройте `chrome://extensions`
5. Включите "Режим разработчика"
6. Нажмите "Загрузить распакованное расширение"
7. Выберите папку с распакованным расширением

### Вариант 2: Локально из репозитория
1. Откройте `chrome://extensions`
2. Включите "Режим разработчика"
3. Нажмите "Загрузить распакованное расширение"
4. Выберите папку `C:\Project\Perplexity Cursor\extension\dist`

## 🧪 Как протестировать

### 1. Проверка подключения к API
1. Откройте расширение (кликните на иконку)
2. Введите лицензионный ключ
3. Нажмите "✓ Применить"
4. Если ключ валиден, вы увидите баланс
5. Если ошибка "ERR_CONNECTION_REFUSED" — значит API недоступен

### 2. Проверка отправки промптов
1. Откройте Discord (`https://discord.com`)
2. Перейдите в канал с Midjourney
3. В расширении введите промпты (по одному на строку)
4. Нажмите "▶️ Start"
5. Расширение должно автоматически отправлять промпты

### 3. Проверка в DevTools
1. Откройте расширение
2. Нажмите F12 (DevTools)
3. Перейдите на вкладку "Console"
4. Должны быть логи:
   ```
   Batch validation...
   Session token received
   Sending prompt 1/5...
   ```
5. **НЕ должно быть:** `ERR_CONNECTION_REFUSED` или `localhost:8000`

## ⚠️ Важно: Обновите Railway URL

**Production URL:** `backend-production-40040.up.railway.app`

Если ваш реальный production URL другой, обновите:

1. **Файл:** `extension/src/constants/config.ts`
   ```typescript
   export const PRODUCTION_API_URL = 'https://ВАШ-РЕАЛЬНЫЙ-URL.up.railway.app/api/v1';
   ```

2. **Файл:** `extension/src/manifest.json`
   ```json
   "host_permissions": [
     "https://discord.com/*",
     "https://ВАШ-РЕАЛЬНЫЙ-URL.up.railway.app/*",
     "http://localhost:8000/*"
   ]
   ```

3. **Пересоберите:**
   ```powershell
   .\scripts\package-extension.ps1 -Version 1.0.4
   ```

## 🚀 Деплой обновлённого расширения

```powershell
# 1. Проверьте, что latest.zip обновлён
ls frontend/public/downloads/extension/

# 2. Закоммитьте изменения
git add .
git commit -m "Fix extension: configure production API URL"
git push

# 3. Railway автоматически задеплоит frontend с новым latest.zip
```

## 📝 Changelog v1.0.3

- ✅ Настроен production API URL (Railway)
- ✅ Обновлены permissions для production
- ✅ Добавлена информация об API в UI
- ✅ Исправлена ошибка "ERR_CONNECTION_REFUSED"
- ✅ Graceful degradation при недоступности API (кэш 5 минут)

## 🔧 Troubleshooting

### Ошибка "ERR_CONNECTION_REFUSED"
**Причина:** Расширение не может подключиться к API

**Решение:**
1. Проверьте, что backend на Railway запущен: `https://backend-production-40040.up.railway.app/health`
2. Проверьте URL в `extension/src/constants/config.ts`
3. Проверьте permissions в `manifest.json`
4. Пересоберите расширение

### Ошибка "Invalid license key"
**Причина:** Ключ не найден в базе или истёк

**Решение:**
1. Проверьте ключ на сайте: `/dashboard`
2. Убедитесь, что подписка активна
3. Проверьте баланс кредитов

### Расширение не отправляет промпты
**Причина:** Не найдено поле ввода Discord

**Решение:**
1. Нажмите "🤖 Авто-поиск" в расширении
2. Если не помогло — "🎯 Ручной-поиск"
3. Убедитесь, что вы на странице Discord с каналом Midjourney

