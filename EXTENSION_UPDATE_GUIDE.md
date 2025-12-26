# Обновление расширения на сайте

Краткая инструкция по публикации новой версии Chrome Extension для пользователей.

## Быстрый старт

```powershell
# 1. Упаковать расширение и опубликовать на сайте (одна команда)
powershell -ExecutionPolicy Bypass -File .\scripts\package-extension.ps1 -Version 1.0.3

# 2. Задеплоить изменения на Railway
git add frontend/public/downloads/extension/
git commit -m "Update extension to v1.0.3"
git push
```

## Что происходит автоматически

Скрипт `scripts/package-extension.ps1`:
1. ✅ Обновляет версию в `extension/src/manifest.json`
2. ✅ Собирает extension → `extension/dist/`
3. ✅ Создаёт `frontend/public/downloads/extension/latest.zip`
4. ✅ Генерирует `frontend/public/downloads/extension/latest.json` (версия, SHA256, размер, дата)

## Как пользователи скачивают расширение

- **URL скачивания:** `/api/extensions/download/zip` (всегда актуальная версия)
- **Метаданные:** `/api/extensions/latest` (версия, размер, дата сборки)
- **UI:** На странице `/dashboard` отображается актуальная версия и кнопка "Скачать ZIP"

## Структура файлов

```
frontend/public/downloads/extension/
├── latest.zip       ← Актуальная сборка расширения
└── latest.json      ← Метаданные (версия, SHA256, размер, дата)
```

## Примечания

- ❌ **EXE-файл больше не поддерживается** (убран из UI и API)
- ✅ Пользователи устанавливают расширение вручную через `chrome://extensions` (Developer mode → Load unpacked)
- ✅ Версия на сайте НЕ обязана совпадать с версией фронтенда/бэкенда
- ✅ Файл `latest.zip` автоматически раздаётся с правильными заголовками (`Content-Disposition: attachment`, `Cache-Control: no-store`)

## Требования

- Node.js + npm (для сборки extension)
- PowerShell 5.1+ (Windows)

