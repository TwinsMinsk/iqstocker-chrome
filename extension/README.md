# 🔌 IQStocker Chrome Auto - Extension

Chrome расширение для автоматизации отправки промптов в Midjourney через Discord.

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка API URL

```bash
# Отредактируйте src/utils/api-client.ts
# Или установите через chrome.storage.local.set({ api_base_url: '...' })
```

### 3. Сборка расширения

```bash
npm run build
```

Расширение будет собрано в папке `dist/`

### 4. Загрузка в Chrome

1. Откройте `chrome://extensions/`
2. Включите "Developer mode"
3. Нажмите "Load unpacked"
4. Выберите папку `dist/`

## 📁 Структура проекта

```
extension/
├── src/
│   ├── manifest.json      # Chrome MV3 manifest
│   ├── popup.html         # Popup HTML
│   ├── popup.ts           # Popup логика
│   ├── popup.css          # Popup стили
│   ├── content.ts         # Content script для Discord
│   ├── service-worker.ts     # Background worker
│   ├── utils/
│   │   ├── api-client.ts  # API клиент с batch validation
│   │   ├── automation.ts  # Логика автоматизации
│   │   └── fingerprint.ts # Device fingerprinting
│   └── types/             # TypeScript типы
├── build/
│   └── build.js           # esbuild скрипт
└── dist/                  # Собранное расширение
```

## 🔐 Защита

Расширение использует **batch validation** для защиты:
- Один запрос в начале сессии (batch-validate)
- Отправка промптов БЕЗ дополнительных API запросов
- Один запрос в конце (finalize-session)

**Graceful degradation:**
- Работает offline с кэшированными разрешениями
- Health check для проверки доступности API

## 🛠️ Технологии

- **TypeScript** - Type safety
- **Chrome Manifest V3** - Latest Chrome extension API
- **esbuild** - Fast bundler

## 📦 Packaging

### Для разработки
```bash
npm run build
# Загрузите dist/ как unpacked extension
```

### Для production
```bash
# Linux/Mac
npm run package

# Windows
npm run package:win
```

Создаст `.crx` файл в папке `releases/`

⚠️ **ВАЖНО:** Сохраните `private-key.pem` в безопасном месте!

## 🔧 API Integration

Расширение использует следующие endpoints:
- `POST /extensions/batch-validate` - Batch validation
- `POST /extensions/finalize-session` - Финализация
- `GET /extensions/balance` - Баланс
- `GET /extensions/health` - Health check

## 📚 Документация

Полная документация находится в `../Docs/`:
- `IMPLEMENTATION_GUIDE.md` - Пошаговое руководство
- `SECURITY_PROTECTION_GUIDE.md` - Документация по защите

## 🧪 Тестирование

```bash
# Unit тесты
npm test

# E2E тесты (требует установленного расширения)
npm run test:e2e
```
