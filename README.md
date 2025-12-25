# 🚀 IQStocker Chrome Auto
## SaaS-сервис для автоматизации отправки промптов в Midjourney через Discord

**Статус:** 🟢 Ready for Production  
**Версия:** 1.0.0  
**Разработчик:** Solo developer  

---

## 📋 О ПРОЕКТЕ

IQStocker Chrome Auto — это SaaS-сервис, который автоматизирует отправку промптов в Midjourney через Discord браузерное расширение.

### Основные возможности:
- ✅ Автоматическая отправка промптов в Discord с настраиваемым интервалом
- ✅ Управление подписками и лицензиями через веб-панель
- ✅ Интеграция с Telegram Tribute для платежей
- ✅ Админ-панель для управления пользователями
- ✅ Аналитика использования

---

## 🏗️ АРХИТЕКТУРА

```
┌─────────────────┐
│   Frontend      │  Next.js 14 (Railway)
│   (Next.js)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Backend       │  FastAPI (Railway)
│   (FastAPI)     │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│PostgreSQL│ │ Redis │
└────────┘ └────────┘

┌─────────────────┐
│   Extension     │  Chrome MV3 (.crx)
│   (Chrome)      │
└─────────────────┘
```

---

## 📚 ДОКУМЕНТАЦИЯ

Вся документация находится в папке `Docs/`:

- **README_QUICKSTART.md** — Быстрый старт (начните отсюда!)
- **PROJECT_SPECIFICATION.md** — Полное техническое задание
- **IMPLEMENTATION_GUIDE.md** — Пошаговое руководство неделю за неделей
- **API_SPECIFICATION.md** — REST API документация
- **DATABASE_SCHEMA.md** — Структура базы данных
- **EXTENSION_BUILD_GUIDE.md** — Руководство по сборке расширения
- **INDEX.md** — Навигация по всей документации

**Полный список:** См. `Docs/INDEX.md`

---

## 🚀 БЫСТРЫЙ СТАРТ

### Production деплой (готово к использованию!)

```bash
# 1. Настройте .env файлы
cp backend/env.example backend/.env
cp frontend/env.example frontend/.env
# Отредактируйте файлы

# 2. Запустите автоматический деплой
./scripts/deploy.sh  # Linux/Mac
# или
.\scripts\deploy.ps1  # Windows
```

📖 **Полная инструкция**: [PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md)  
⚡ **Быстрый старт**: [QUICK_DEPLOY.md](QUICK_DEPLOY.md)

### Локальная разработка

```bash
# Backend
cd backend
poetry install
poetry run uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# Extension
cd extension
npm install
npm run build
```

---

## 💻 ТЕХНОЛОГИЧЕСКИЙ СТЕК

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend:** FastAPI, Python 3.11+, SQLAlchemy 2.0
- **Database:** PostgreSQL 15, Redis 7
- **Extension:** Chrome Manifest V3, TypeScript
- **Deployment:** Railway (Frontend + Backend)
- **Payments:** Telegram Tribute API
- **Monitoring:** Sentry, Grafana

---

## 📦 СТРУКТУРА ПРОЕКТА

```
iqstocker-chrome/
├── backend/          # FastAPI приложение
├── frontend/         # Next.js приложение
├── extension/        # Chrome расширение
├── Docs/            # Вся документация
├── .gitignore
└── README.md
```

---

## 🔐 БЕЗОПАСНОСТЬ

⚠️ **ВАЖНО:**
- Файл `private-key.pem` для подписи расширения НЕ должен попасть в Git
- Все секреты хранятся в `.env` файлах (не коммитятся)
- License keys хешируются в базе данных

---

## 📝 ЛИЦЕНЗИЯ

Proprietary — Все права защищены

---

## 📞 ПОДДЕРЖКА

Для вопросов и помощи:
- Смотрите документацию в `Docs/`
- Используйте `Docs/INDEX.md` для навигации

---

## 🎯 PRODUCTION DEPLOYMENT

Проект полностью готов к production деплою!

### 🚂 Деплой на Railway (рекомендуется для начала):

**Быстрый старт:**
- 📖 [RAILWAY_STEP_BY_STEP.md](RAILWAY_STEP_BY_STEP.md) - **Пошаговая инструкция** (начните отсюда!)
- ⚡ [RAILWAY_QUICK_START.md](RAILWAY_QUICK_START.md) - Краткая версия
- 📚 [RAILWAY_DEPLOYMENT_GUIDE.md](RAILWAY_DEPLOYMENT_GUIDE.md) - Полное руководство

**Преимущества Railway:**
- ✅ Бесплатный tier ($5 кредитов в месяц)
- ✅ Автоматические домены для тестирования
- ✅ Managed PostgreSQL
- ✅ Автоматический деплой из GitHub
- ✅ Простая настройка

### 📋 Что включено:
- ✅ Docker контейнеры для всех сервисов
- ✅ Production-ready конфигурация
- ✅ Автоматические скрипты деплоя
- ✅ Health checks и мониторинг
- ✅ Backup и restore стратегия
- ✅ SSL/HTTPS поддержка
- ✅ Nginx reverse proxy
- ✅ Полная документация

### 📚 Документация по деплою:
- 📖 [PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md) - Полное руководство (VPS)
- ⚡ [QUICK_DEPLOY.md](QUICK_DEPLOY.md) - Быстрый старт за 5 минут
- ✅ [PRODUCTION_READY_CHECKLIST.md](PRODUCTION_READY_CHECKLIST.md) - Чек-лист готовности
- 💾 [BACKUP_STRATEGY.md](BACKUP_STRATEGY.md) - Резервное копирование

---

**Создано:** December 22, 2025  
**Версия:** 1.0.0  
**Статус:** 🟢 Production Ready

