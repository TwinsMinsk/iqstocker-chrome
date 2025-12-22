# 🚀 IQStocker Chrome Auto
## SaaS-сервис для автоматизации отправки промптов в Midjourney через Discord

**Статус:** 🟡 В разработке  
**Версия:** 1.0.0 (MVP)  
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

### 1. Прочитайте документацию
```bash
# Начните с этого файла:
Docs/README_QUICKSTART.md
```

### 2. Настройте окружение
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

### 3. Следуйте IMPLEMENTATION_GUIDE.md
- Week 1-2: Backend
- Week 2-3: Frontend
- Week 3-4: Extension
- Week 4-5: Integration

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

**Создано:** December 22, 2025  
**Версия:** 1.0.0  
**Статус:** В разработке 🚧

