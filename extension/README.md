# 🔌 IQStocker Chrome Auto - Extension

Chrome Manifest V3 расширение для автоматизации отправки промптов в Midjourney через Discord.

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Development build

```bash
npm run build
```

### 3. Загрузка в Chrome (Developer Mode)

1. Откройте Chrome → `chrome://extensions/`
2. Включите "Developer mode"
3. Нажмите "Load unpacked"
4. Выберите папку `extension/dist/`

## 📁 Структура проекта

```
extension/
├── src/
│   ├── manifest.json      # Chrome MV3 manifest
│   ├── popup.html         # Popup UI
│   ├── popup.ts           # Popup logic
│   ├── content.ts         # Content script (Discord)
│   ├── service-worker.ts  # Background worker
│   ├── utils/             # Utilities
│   ├── types/             # TypeScript types
│   └── constants/         # Constants (selectors, etc.)
├── build/                 # Build scripts
├── dist/                  # Compiled output
└── tests/                 # Tests
```

## 📦 Production Build (.crx)

```bash
# Build extension
npm run build

# Package to .crx (Linux/Mac)
npm run package

# Package to .crx (Windows)
npm run package:win
```

**⚠️ ВАЖНО:** PEM ключ для подписи должен быть в безопасном месте!

## 📚 Документация

Полная документация находится в `../Docs/`:
- `EXTENSION_BUILD_GUIDE.md` - Руководство по сборке .crx
- `IMPLEMENTATION_GUIDE.md` - Пошаговое руководство

