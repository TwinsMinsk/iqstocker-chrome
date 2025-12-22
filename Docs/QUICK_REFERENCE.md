# 📋 КРАТКАЯ ШПАРГАЛКА
## Быстрая справка по всему проекту

---

## 🎯 ОСНОВНЫЕ ЧИСЛА

| Метрика | Значение |
|---------|----------|
| **Срок разработки** | 8-10 недель |
| **Разработчиков** | 1 (solo) |
| **IDE** | Cursor AI |
| **Фаз** | 3 (MVP → Polish → Future) |
| **Недель Phase 1** | 5 недель |
| **Недель Phase 2** | 2 недели |
| **Таблиц в БД** | 5 (Users, Subscriptions, Licenses, Transactions, Logs) |
| **Endpoints API** | ~25 endpoints |
| **React компонентов** | ~15 основных |
| **Chrome MV3 скриптов** | 3 (popup, content, service-worker) |

---

## 💻 ТЕХНОЛОГИЯ

```
Frontend:    Next.js 14 + React 18 + TypeScript + Tailwind
Backend:     FastAPI + Python 3.11 + PostgreSQL + SQLAlchemy
Extension:   Chrome MV3 + TypeScript + esbuild (to EXE)
Payments:    Telegram Tribute API
Email:       SendGrid
Monitoring:  Sentry + Grafana
Deploy:      Vercel (frontend) + Railway (backend)
DNS:         Cloudflare
Version:     v1.0.0 → v1.1.0 → v2.0.0
```

---

## 🔑 КЛЮЧЕВЫЕ ФАЙЛЫ ПРОЕКТА

### Backend
```
backend/
├── app/
│   ├── models/          ← Database models (5 tables)
│   ├── schemas/         ← Pydantic validation
│   ├── api/v1/          ← REST endpoints
│   ├── services/        ← Business logic
│   ├── core/            ← Config, security, JWT
│   └── main.py          ← FastAPI app
├── migrations/          ← Alembic SQL
├── tests/               ← Unit tests
└── requirements.txt     ← Dependencies
```

### Frontend
```
frontend/
├── app/
│   ├── page.tsx         ← Landing
│   ├── register/        ← Sign up
│   ├── login/           ← Sign in
│   └── dashboard/       ← Main area
├── components/          ← React components
├── services/            ← API client
├── types/               ← TypeScript types
└── styles/              ← Global CSS
```

### Extension
```
extension/
├── src/
│   ├── manifest.json    ← MV3 manifest
│   ├── popup.html       ← UI
│   ├── popup.ts         ← Logic
│   ├── content.ts       ← Discord integration
│   ├── service-worker.ts ← Background
│   └── utils/           ← Helpers
├── build/               ← Build scripts (to EXE)
└── dist/                ← Compiled output
```

---

## 📊 DATABASE TABLES

| Table | Columns | Key Point |
|-------|---------|-----------|
| **users** | id, email, password_hash, oauth_google_id, is_admin | Login + roles |
| **subscriptions** | id, user_id, plan_id, credits_balance, expires_at | Billing state |
| **license_keys** | id, user_id, key_hash, key_display, is_active | Extension auth |
| **transactions** | id, user_id, amount, credits, type, status | Payment history |
| **extension_logs** | id, user_id, session_id, status, error_type | **NO PROMPTS!** |

⚠️ **ВАЖНО:** extension_logs НЕ содержит текст промптов (только метаданные)

---

## 🔌 API ENDPOINTS (25 total)

### Auth (5 endpoints)
```
POST   /auth/register           ← Register
POST   /auth/login              ← Login
POST   /auth/google             ← OAuth
POST   /auth/refresh            ← Refresh token
POST   /auth/logout             ← Logout
```

### Users (3 endpoints)
```
GET    /users/me                ← Profile
PATCH  /users/me                ← Update email
PATCH  /users/me/password       ← Change password
```

### License Keys (2 endpoints)
```
POST   /users/me/license-keys   ← Generate key
DELETE /users/me/license-keys/{id} ← Revoke key
```

### Extension (3 endpoints)
```
POST   /extensions/validate-key ← Validate
GET    /extensions/balance      ← Get balance
POST   /extensions/log-usage    ← Log session
```

### Billing (3 endpoints)
```
GET    /subscriptions/plans     ← List plans
POST   /subscriptions/purchase-plan ← Buy
GET    /transactions            ← Payment history
```

### Analytics (1 endpoint)
```
GET    /analytics/usage         ← Charts
```

### Admin (3 endpoints)
```
GET    /admin/users             ← List users
PATCH  /admin/users/{id}        ← Edit user
GET    /admin/logs              ← View logs
```

### Webhook (1 endpoint)
```
POST   /payments/webhook/tribute ← Tribute payment
```

### Downloads (2 endpoints)
```
GET    /extensions/download/zip ← ZIP file
GET    /extensions/download/exe ← EXE file
```

---

## 🔄 ОСНОВНЫЕ FLOWS

### Регистрация → Платёж → Расширение
```
1. User регистрируется (POST /auth/register)
2. Email verification письмо отправляется
3. User подтверждает email (link in email)
4. User логинится (POST /auth/login)
5. Dashboard показывает: баланс (50 credit free), ключ, расширение
6. User скачивает расширение (ZIP/EXE)
7. User вставляет ключ в расширение
8. Extension валидирует ключ (POST /extensions/validate-key)
9. User может отправлять промпты в Discord
10. Extension логирует в API (POST /extensions/log-usage)
```

### Платёж через Tribute
```
1. User выбирает план (BASIC €3, STANDARD €10, PRO €17)
2. Frontend редирект на Tribute (POST /subscriptions/purchase-plan)
3. User платит в Tribute
4. Tribute webhook отправляет статус (POST /payments/webhook/tribute)
5. Backend проверяет подпись (HMAC-SHA256)
6. Credits начисляются пользователю
7. Email отправляется с подтверждением
8. Dashboard обновляется (новый баланс)
```

### Extension отправка промптов
```
1. User вставляет промпты в popup
2. Устанавливает интервал (секунды)
3. Кликает "Start"
4. Content Script находит Discord input
5. Отправляет промпт за промптом с интервалом
6. Если ошибка → пауза
7. Если 3 ошибки подряд → pause + показать ошибку
8. User видит статус в popup
9. Логи отправляются в IndexedDB (локально)
10. При stop → логи отправляются в API (POST /extensions/log-usage)
```

---

## 🎯 КРИТИЧЕСКИЕ МОМЕНТЫ

### ✅ ДЕЛАЙ

- ✅ Используй `@Codebase` в промптах Cursor
- ✅ Коммитай каждый день (`git commit -m "feat: ..."`)
- ✅ Тестируй каждый endpoint (curl или Swagger UI)
- ✅ Сохраняй только метаданные в extension_logs
- ✅ Хешируй лицензионные ключи (bcrypt)
- ✅ Верифицируй webhook подписи (HMAC-SHA256)
- ✅ Используй Redis для кэширования сессий
- ✅ Логируй ошибки в Sentry

### ❌ НЕ ДЕЛАЙ

- ❌ Не сохраняй тексты промптов в БД
- ❌ Не коммитай .env или secrets
- ❌ Не используй hardcoded values (используй env vars)
- ❌ Не убирай обработку ошибок для экономии кода
- ❌ Не игнорируй CORS/CSRF для ускорения
- ❌ Не заканчивай Week без тестов

---

## 📅 НЕДЕЛЬНЫЙ ПЛАН

```
Week 1-2: Backend foundation (models, auth, DB)
Week 2-3: Frontend foundation (pages, components, forms)
Week 3-4: Extension (popup, content script, Discord)
Week 4-5: Integration (connect all parts, webhooks, E2E tests)
Week 6-7: Polish (admin panel, analytics, improvements)
Week 8: Production launch (final QA, deployment)
```

---

## 🚀 ПЕРЕД ЗАПУСКОМ (LAUNCH CHECKLIST)

### Week 1-5 итоги (должно быть ✅)
- [ ] Backend на Railway работает
- [ ] Frontend на Vercel работает
- [ ] Extension скомпилирована в EXE + ZIP
- [ ] Все endpoints протестированы
- [ ] Webhook Tribute работает
- [ ] E2E тесты passing
- [ ] Sentry логирует ошибки
- [ ] GitHub Actions CI/CD работает

### Week 6-7 итоги (должно быть ✅)
- [ ] Admin panel функциональна
- [ ] Analytics работают
- [ ] Все улучшения внедрены
- [ ] Документация полная
- [ ] Security audit пройден
- [ ] Performance optimized (Lighthouse > 90)
- [ ] Monitoring setup complete

### Перед Production
- [ ] Все checkboxes выше ✅
- [ ] Database backup создан
- [ ] Environment variables установлены
- [ ] Все errors <= 1%
- [ ] Team briefed
- [ ] Announce ready

---

## 🎓 КАК ЧИТАТЬ ДОКУМЕНТЫ

| Нужно | Смотри файл | Где именно |
|------|-----------|-----------|
| Полный обзор проекта | PROJECT_SPECIFICATION | Top section |
| Что делать сегодня | IMPLEMENTATION_GUIDE | Текущая неделя |
| Какой API вызывать | API_SPECIFICATION | Нужный endpoint |
| Структура БД | DATABASE_SCHEMA | Нужная таблица |
| Готов к запуску? | LAUNCH_CHECKLIST | Phase 1/2 items |
| Как использовать Cursor | CURSOR_WORKFLOW | Entire file |

---

## 💡 ПРИМЕРЫ CURSOR ПРОМПТОВ

### Пример 1: Создай endpoint
```
@Codebase

Создай POST /auth/register endpoint (из API_SPECIFICATION).
Используй models из DATABASE_SCHEMA.
Добавь email verification (SendGrid API).
Код по примеру existing endpoints в app/api/v1/endpoints/auth.py.
```

### Пример 2: Создай компонент
```
@Codebase

Создай React компонент BalanceCard (из IMPLEMENTATION_GUIDE).
Используй API из API_SPECIFICATION (GET /users/me).
Стиль: Tailwind CSS + shadcn/ui.
Включи loading states и error handling.
```

### Пример 3: Создай модель
```
@Codebase

Создай SQLAlchemy model User (из DATABASE_SCHEMA).
Добавь все поля и constraints из SQL.
Добавь relationships к другим models.
Используй UUID primary keys и datetime defaults.
```

---

## 📈 УСПЕШНЫЕ МЕТРИКИ

| День | Метрика | Цель |
|------|---------|------|
| Day 1 | Backend инициализирован | ✅ FastAPI работает |
| Day 2 | Models созданы | ✅ Migration applied |
| Day 3 | Auth работает | ✅ JWT генерируется |
| Week 2 | Frontend работает | ✅ Landing page видна |
| Week 3 | Extension загружается | ✅ Popup открывается |
| Week 4 | All части connected | ✅ Register → Extension flow |
| Week 5 | MVP готов | ✅ На production |
| Week 7 | v1.1 готова | ✅ Admin panel works |

---

## 🆘 SOS КОМАНДЫ

```bash
# Если всё сломалось
git status                    # Что изменилось?
git diff                      # Что именно?
git reset --hard origin/develop  # Вернуться назад

# Если тесты падают
pytest -v                     # See what failed
pytest tests/test_auth.py     # Run one test file

# Если PostgreSQL не работает
docker-compose down           # Stop
docker-compose up -d          # Start again
docker-compose logs db        # See errors

# Если забыл что-то
grep -r "function_name" .     # Find in codebase
git log --oneline -10         # Last 10 commits
```

---

## ✅ SUMMARY

```
📚 6 документов — всё что нужно
📂 Полная структура проекта
🚀 Недель за неделей инструкции
🔌 25 API endpoints специфицированы
🗄️ 5 таблиц БД с SQL + models
✅ Чеклист для каждой фазы
💡 Примеры Cursor промптов
📊 Метрики успеха определены

START → IMPLEMENTATION_GUIDE (Week 1)
DEVELOP → каждый день используй нужный документ
LAUNCH → проверь LAUNCH_CHECKLIST
MAINTAIN → следи за метриками

Let's build! 🚀
```

---

**Created:** December 22, 2025  
**Version:** 1.0  
**Last Updated:** December 22, 2025  
**Status:** Ready for Development ✅