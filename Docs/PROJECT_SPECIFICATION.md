# 📋 MIDJOURNEY AUTO: ПОЛНОЕ ТЕХНИЧЕСКОЕ ЗАДАНИЕ
## Фазовая разработка (Phase-based Development)

**Статус:** Active Development  
**Версия:** 2.0 (Уточнённая от PM)  
**Дата:** December 22, 2025  
**Разработчик:** Single Developer (Cursor IDE)  

---

## 🎯 БИЗНЕС-ТРЕБОВАНИЯ

### Видение продукта
Веб-сервис для автоматизации отправки промптов в Midjourney через Discord браузерное расширение + веб-панель управления подписками и лицензиями.

### Целевая аудитория
- Digital artists, дизайнеры, контент-креаторы
- Пользователи Midjourney с потребностью массовой отправки (100+ промптов/день)
- Агентства и исследователи AI

### Модель доходов
- **Pricing:** €0.003 за промпт
- **BASIC:** €3 (1000 промптов/30 дней)
- **STANDARD:** €10 (5000 промптов/30 дней) — самый популярный
- **PRO:** €17 (10000 промптов/30 дней)
- **Free tier:** 50 кредитов при регистрации

---

## 📐 АРХИТЕКТУРА СИСТЕМЫ

```
┌─────────────────────────────────────────────────────────┐
│                    ПОЛЬЗОВАТЕЛЬ                         │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌──────────────────┐   ┌─────────────────────┐
│  ВЕБА-САЙТ       │   │  РАСШИРЕНИЕ CHROME  │
│ (Next.js 14)     │   │  (Chrome MV3)       │
│                  │   │  (Compiled to EXE)  │
│ • Landing        │   │                     │
│ • Auth (OAuth)   │   │ • Popup UI          │
│ • Dashboard      │   │ • Content Script    │
│ • Billing        │   │ • Error Detection   │
│ • Admin Panel    │   │ • Rate Limit Detection
│                  │   │ • Session Save      │
└────────┬─────────┘   └────────┬────────────┘
         │                      │
         │      ┌───────────────┘
         │      │
         ▼      ▼
    ┌──────────────────────────────┐
    │   BACKEND API (FastAPI)      │
    │                              │
    │ ✓ Authentication (JWT+OAuth) │
    │ ✓ User Management            │
    │ ✓ License Management         │
    │ ✓ Billing (Tribute webhook)  │
    │ ✓ Admin API                  │
    │ ✓ Analytics & Logging        │
    └──────────┬───────────────────┘
               │
     ┌─────────┼──────────┬─────────┐
     │         │          │         │
     ▼         ▼          ▼         ▼
┌─────────┐┌────────┐┌──────────┐┌───────┐
│PostgreSQL││ Redis  ││ Sentry   ││Grafana│
│(Railway) ││(Cache) ││(Errors)  ││(Dash) │
└─────────┘└────────┘└──────────┘└───────┘
```

---

## 🔄 ФАЗОВАЯ РАЗРАБОТКА

### ⚡ PHASE 1: MVP (4-5 недель)
**Цель:** Полнофункциональный сервис с основными возможностями

#### Backend (Week 1-2)
- ✅ FastAPI база + PostgreSQL
- ✅ User model + JWT аутентификация
- ✅ Subscription model + license keys
- ✅ Billing endpoints (Tribute webhook)
- ✅ Extension validation endpoints
- ✅ Redis базовое кэширование

#### Frontend (Week 2-3)
- ✅ Landing page (простая)
- ✅ Registration + Login
- ✅ OAuth Google integration
- ✅ Dashboard (баланс, подписка, ключ)
- ✅ Billing page (тарифы + платежи)
- ✅ Email verification

#### Extension (Week 3-4)
- ✅ Popup UI (ввод ключа, промптов, интервала)
- ✅ Content Script (отправка в Discord)
- ✅ Error handling (3 ошибки → pause)
- ✅ Rate limit detection
- ✅ Session save (IndexedDB логирование)
- ✅ Compilation to EXE + code encryption

#### Integration & QA (Week 4-5)
- ✅ E2E тестирование (регистрация → расширение)
- ✅ Webhook testing (Tribute)
- ✅ Deployment (Vercel + Railway)
- ✅ Security review

#### Deliverables
- 🚀 Рабочий MVP на production
- 📄 API документация (Swagger)
- 📖 User инструкция (текст + видео)
- 🔐 Скомпилированное расширение (EXE)

---

### 🚀 PHASE 2: Polish & Expand (Week 6-7)
**Цель:** Стабильность, аналитика, улучшения

#### Backend (Week 6)
- ✅ Admin panel API endpoints
- ✅ Payment history endpoint
- ✅ Usage analytics endpoint
- ✅ Sentry integration
- ✅ Grafana setup

#### Frontend (Week 6-7)
- ✅ Admin panel UI
- ✅ Payment history page
- ✅ Usage analytics (графики)
- ✅ Password reset (email)
- ✅ User settings page

#### Extension (Week 7)
- ✅ Resume функция (продолжить с сохранённой сессии)
- ✅ Улучшенный error reporting
- ✅ Экспорт логов (CSV)
- ✅ Notification при лимитах

#### Deliverables
- 📊 Admin panel (полный функционал)
- 📈 Analytics dashboard (Grafana)
- 📝 Полная документация

---

### 🔮 PHASE 3: Future (v1.1+)
**Отложено на потом:**
- Presets (сохранённые наборы промптов)
- Scheduling (запланированная отправка)
- Batch операции
- 2FA (не нужна)
- Celery queue (если потребуется)
- Webhook retry logic (базовое в v1)

---

## 💻 ТЕХНОЛОГИЧЕСКИЙ СТЕК

### Frontend
```
Framework:     Next.js 14 (App Router)
UI Library:    React 18
Language:      TypeScript
Styling:       Tailwind CSS + shadcn/ui
State:         Zustand + TanStack Query
Forms:         React Hook Form + Zod
Auth:          NextAuth.js (OAuth Google)
HTTP:          Axios
Deployment:    Railway (вместе с Backend)
```

### Backend
```
Framework:     FastAPI (Python 3.11+)
Database:      PostgreSQL 15 (Railway)
ORM:           SQLAlchemy 2.0
Migrations:    Alembic
Auth:          JWT (PyJWT) + bcrypt
Cache:         Redis 7+ (sessions + rate limit)
Email:         SendGrid или FastMail API
Validation:    Pydantic v2
Async:         asyncio + httpx
Monitoring:    Sentry
Analytics:     Grafana + Prometheus (optional)
Deployment:    Railway
```

### Extension
```
Manifest:      Chrome Manifest V3
Language:      TypeScript
Bundler:       esbuild
Storage:       chrome.storage.sync + IndexedDB
Distribution:  .crx file с PEM-ключом (самостоятельная установка)
Build:         Chrome packaging с приватным ключом
Testing:       Manual (Discord DOM mocking)
```

### Infrastructure
```
Frontend:      Railway (Node.js + Next.js)
Backend:       Railway (Python + FastAPI)
Database:      Railway PostgreSQL (shared → dedicated)
Cache:         Railway Redis
DNS/CDN:       Cloudflare
Email:         SendGrid (free tier: 100/day)
Payments:      Telegram Tribute API (официальная документация)
Logging:       Sentry
Analytics:     Grafana + Prometheus
Backup:        Railway auto-backup (daily)
Extension:     Самостоятельная установка через .crx файл
```

---

## 🔑 КЛЮЧЕВЫЕ ИЗМЕНЕНИЯ ОТ ИСХОДНОГО ТЗ

### ✅ Оставляем
- FastAPI + Next.js + PostgreSQL + Railway
- Chrome MV3 расширение
- JWT + OAuth Google
- Admin panel (добавили в v1!)
- Redis для sessions + rate limit

### ❌ Убираем из v1.0
- Celery + RabbitMQ (сложно, не нужно)
- 2FA (не требуется)
- Email confirmation (не требуется заказчиком)

### ➕ Добавляем (новое)
1. **Extension packaging to .crx + PEM signing**
   - Chrome packaging tool для создания .crx файла
   - PEM приватный ключ для подписи расширения
   - Самостоятельная установка без Chrome Web Store
   
2. **Rate Limit Detection (в расширении)**
   - Автоматическое увеличение интервала при throttling
   - Детектирование 429/503 ошибок от Midjourney
   
3. **Resume функция**
   - Сохранение прогресса в IndexedDB
   - Возможность продолжить после перезапуска браузера
   
4. **Улучшенное логирование**
   - Полные логи в IndexedDB
   - Экспорт в CSV для отладки
   
5. **OAuth Google интеграция**
   - NextAuth.js для простого login

6. **Admin Panel в v1.0** (не v1.1!)
   - Управление пользователями
   - Просмотр логов
   - Ручное изменение баланса

7. **Payment History + Analytics в dashboard**
   - История платежей (таблица)
   - Графики использования

8. **Email verification при регистрации**
   - SendGrid API
   - Confirmation link

9. **Sentry + Grafana с самого начала**
   - Error tracking
   - Performance monitoring

### ❌ НЕ сохраняем тексты промптов в БД
**Оптимизация:** Логировать только метаданные (время, статус, ошибка), не само содержимое промптов
- Экономия места в БД
- Приватность пользователей
- Быстрее запросы

---

## 📱 ФУНКЦИОНАЛЬНЫЕ ТРЕБОВАНИЯ

### Landing Page
```
✓ Заголовок + описание сервиса
✓ "Как это работает" секция
✓ Тарифы (таблица)
✓ FAQ
✓ CTA кнопки: "Попробовать бесплатно" + "Купить тариф"
```

### Authentication
```
✓ Email + Password регистрация
✓ Email verification (опционально, только для безопасности личного кабинета)
✓ OAuth Google login
✓ JWT токены (access + refresh)
✓ License Key для расширения (вводится сразу при открытии)
✓ Password reset (v1.1) — but implement v1.0!

ВАЖНО: Email verification НЕ блокирует использование расширения!
Расширение работает сразу после ввода валидного License Key.
```

### Dashboard (Personal Cabinet)
```
✓ Баланс кредитов (с EUR эквивалентом)
✓ Статус подписки (дата истечения)
✓ Текущий тариф (BASIC/STANDARD/PRO)
✓ Лицензионный ключ (скопировать/переген)
✓ Скачивание расширения (ZIP + EXE)
✓ Видеоинструкция (YouTube embed)
✓ Payment history (таблица последних 10 платежей)
✓ Usage analytics (график промптов/день за 30 дней)
```

### Billing
```
✓ Список тарифов с кнопкой "Купить"
✓ Выбор плана → редирект на Tribute
✓ Webhook обработка платежа
✓ Автоматическое начисление кредитов
✓ Проверка expired подписки
```

### Admin Panel
```
✓ Список пользователей (таблица: email, баланс, статус)
✓ Управление юзерами (block/unblock, edit баланс)
✓ Просмотр логов (extension_logs таблица)
✓ Фильтрация и поиск
✓ Export данных (CSV)
```

### Extension (Chrome)
```
POPUP INTERFACE:
✓ ПЕРВЫЙ ЭКРАН: Поле для ввода License Key (без регистрации!)
   - Пользователь копирует ключ из личного кабинета на сайте
   - Вставляет в расширение
   - Расширение валидирует ключ через API
   - Сразу открывается рабочий интерфейс
✓ РАБОЧИЙ ИНТЕРФЕЙС (после валидации ключа):
   - Textarea для списка промптов (multiline)
   - Slider интервала (5-300 сек, default 60)
   - Кнопки: Start | Pause | Stop | Resume
   - Status display (текущий промпт, количество отправленных)
   - Баланс кредитов (синхронизация с API)
   - Логирование (список последних операций)

FUNCTIONALITY:
✓ Валидация ключа при первом открытии (POST /extensions/validate-key)
✓ Автоотправка промптов в Discord с интервалом
✓ Обнаружение ошибок (Discord + Midjourney)
✓ Pause при 3 ошибках подряд
✓ Показать сообщение об ошибке пользователю
✓ Rate limit detection (автоматическое увеличение интервала)
✓ Session save в IndexedDB (прогресс)
✓ Resume после перезапуска (продолжить с сохранённого места)
✓ Экспорт логов (CSV)
```

---

## ⚖️ ЮРИДИЧЕСКИЙ DISCLAIMER

**ВАЖНО ДЛЯ ПОЛЬЗОВАТЕЛЕЙ:**

Используя данный сервис и расширение, вы соглашаетесь с тем, что:

1. **Автоматизация Discord/Midjourney:**
   - Данный сервис предоставляет инструменты автоматизации взаимодействия с Discord и Midjourney
   - Использование автоматизации может противоречить Terms of Service Discord и Midjourney
   - Вы несёте полную ответственность за последствия использования сервиса
   - Ваш аккаунт Discord/Midjourney может быть заблокирован или ограничен

2. **Ответственность пользователя:**
   - Администрация сервиса НЕ несёт ответственности за блокировку ваших аккаунтов
   - Администрация НЕ несёт ответственности за потерю доступа к Midjourney
   - Администрация НЕ гарантирует бесперебойную работу сервиса
   - Администрация НЕ возвращает средства в случае блокировки аккаунта

3. **Использование на свой риск:**
   - Сервис предоставляется "как есть" (AS IS)
   - Пользователь принимает все риски самостоятельно
   - Рекомендуется использовать умеренные интервалы отправки (60+ секунд)
   - Рекомендуется не отправлять более 50-100 промптов в день

4. **Конфиденциальность:**
   - Тексты промптов НЕ сохраняются на сервере (только метаданные)
   - License Key хранится в зашифрованном виде
   - Администрация НЕ имеет доступа к вашим паролям Discord/Midjourney

5. **Технические ограничения:**
   - Селекторы Discord могут перестать работать в любой момент
   - Midjourney может изменить rate limits без предупреждения
   - Сервис может быть недоступен в отдельные периоды

**Продолжая использовать сервис, вы подтверждаете, что прочитали и согласны с данным дисклеймером.**

---

## 🔐 БЕЗОПАСНОСТЬ

### Authentication
```
✓ Passwords hashed with bcrypt
✓ JWT tokens (30-day expiry)
✓ Refresh token rotation
✓ HTTPS only
✓ Secure cookie headers
```

### API Security
```
✓ Rate limiting (100 req/min per IP)
✓ Input validation (Pydantic)
✓ SQL injection prevention (ORM)
✓ CORS configured
✓ Webhook signature verification (HMAC-SHA256)
✓ XSS protection (React auto-escaping)
```

### Extension Security
```
✓ Code encryption (TweetNaCl.js obfuscation)
✓ License key validation on every request
✓ No storage of sensitive data in popup
✓ Content Script isolation
✓ Manifest V3 (modern security model)
```

### Data Protection
```
✓ License keys hashed in database
✓ Passwords never logged
✓ Prompts NOT saved in database (only metadata)
✓ Daily backups (Railway auto-backup)
✓ GDPR compliance (deletion endpoint)
```

---

## 💳 TELEGRAM TRIBUTE API INTEGRATION

**Официальная документация:** https://wiki.tribute.tg/for-content-creators/api-documentation/webhooks

### Настройка интеграции

1. **Получение API Key:**
   - Перейти в Creator Dashboard → Settings (три точки) → API Keys
   - Сгенерировать API Key
   - Указать webhook URL для уведомлений

2. **Webhook URL:** `https://api.yourdomain.com/api/v1/payments/webhook/tribute`

### Webhook Events

Tribute отправляет следующие события:

#### 1. New Subscription (`new_subscription`)
```json
{
  "name": "new_subscription",
  "created_at": "2025-08-25T01:15:58.33246Z",
  "sent_at": "2025-08-25T01:15:58.542279448Z",
  "payload": {
    "subscription_name": "STANDARD Plan",
    "subscription_id": 1644,
    "period_id": 1547,
    "period": "monthly",
    "price": 1000,
    "amount": 1000,
    "currency": "eur",
    "user_id": 31326,
    "telegram_user_id": 12321321,
    "expires_at": "2025-04-20T01:15:57.305733Z"
  }
}
```

#### 2. Cancelled Subscription (`cancelled_subscription`)
```json
{
  "name": "cancelled_subscription",
  "created_at": "2025-03-21T11:20:44.013969Z",
  "sent_at": "2025-03-21T11:20:44.527657077Z",
  "payload": {
    "subscription_name": "STANDARD Plan",
    "subscription_id": 1646,
    "period_id": 1549,
    "period": "monthly",
    "price": 1000,
    "amount": 1000,
    "currency": "eur",
    "user_id": 31326,
    "telegram_user_id": 12321321,
    "cancel_reason": "",
    "expires_at": "2025-03-20T11:13:44.737Z"
  }
}
```

### Signature Verification

**КРИТИЧЕСКИ ВАЖНО:** Каждый webhook содержит заголовок `trbt-signature` с HMAC-SHA256 подписью request body, подписанной вашим API ключом.

```python
import hmac
import hashlib

def verify_tribute_signature(request_body: bytes, signature: str, api_key: str) -> bool:
    """Verify Tribute webhook signature"""
    computed_signature = hmac.new(
        api_key.encode(),
        request_body,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(computed_signature, signature)
```

### Retry Logic

При ошибке доставки Tribute повторяет отправку через:
- 5 минут
- 15 минут  
- 30 минут
- 1 час
- 10 часов

**Важно:** Реализовать идемпотентность — проверять `subscription_id` или `period_id` на дублирование.

### Response Codes

| Code | Описание |
|------|----------|
| `200` | Webhook успешно обработан |
| `400` | Невалидные данные webhook |
| `401` | Неверная подпись webhook |

### Mapping на наши тарифы

| Tribute Subscription | Наш Plan | Цена | Кредиты |
|---------------------|----------|------|---------|
| BASIC (€3)          | basic    | €3   | 1000    |
| STANDARD (€10)      | standard | €10  | 5000    |
| PRO (€17)           | pro      | €17  | 10000   |

### Обработка платежа (Backend)

```python
@router.post("/payments/webhook/tribute")
async def handle_tribute_webhook(
    request: Request,
    signature: str = Header(..., alias="trbt-signature")
):
    # 1. Получить body
    body = await request.body()
    
    # 2. Verify signature
    if not verify_tribute_signature(body, signature, settings.TRIBUTE_API_KEY):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    # 3. Parse payload
    data = await request.json()
    
    # 4. Check idempotency (избежать дублирования)
    existing = await Transaction.get_by_payment_id(data['payload']['period_id'])
    if existing:
        return {"status": "already_processed"}
    
    # 5. Обработать событие
    if data['name'] == 'new_subscription':
        await process_new_subscription(data['payload'])
    elif data['name'] == 'cancelled_subscription':
        await process_cancelled_subscription(data['payload'])
    
    return {"status": "ok"}
```

### Тестирование

1. **Sandbox режим:** Tribute предоставляет тестовые API keys
2. **Локальное тестирование:** Использовать ngrok для туннеля к localhost
3. **Signature verification:** Всегда проверять подпись перед обработкой

---

## 📊 DATABASE SCHEMA

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  oauth_google_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Subscriptions Table
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  plan_id VARCHAR(50), -- 'free', 'basic', 'standard', 'pro'
  credits_balance INTEGER DEFAULT 0,
  monthly_limit INTEGER,
  used_this_month INTEGER DEFAULT 0,
  status VARCHAR(50), -- 'active', 'expired', 'cancelled'
  subscription_expires_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### License Keys Table
```sql
CREATE TABLE license_keys (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  key_hash VARCHAR(255) UNIQUE, -- bcrypt hashed
  key_display VARCHAR(50), -- 'sk_live_a1b2c3d4...'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  last_used_at TIMESTAMP,
  revoked_at TIMESTAMP
);
```

### Transactions Table (NO PROMPTS TEXT!)
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  amount DECIMAL(10, 2),
  credits INTEGER,
  type VARCHAR(50), -- 'purchase', 'refund'
  status VARCHAR(50), -- 'pending', 'completed', 'failed'
  payment_id VARCHAR(255),
  created_at TIMESTAMP
);
```

### Extension Logs Table (METADATA ONLY)
```sql
CREATE TABLE extension_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  session_id VARCHAR(255),
  status VARCHAR(50), -- 'success', 'error', 'paused'
  error_type VARCHAR(100), -- 'rate_limit', 'invalid_prompt', 'network_error'
  error_message TEXT,
  prompts_count INTEGER,
  duration_seconds INTEGER,
  timestamp TIMESTAMP
);
-- NO prompt_text column!
```

---

## 🧪 TESTING STRATEGY

### Backend Testing
```
✓ Unit tests (pytest) для auth, billing, validation
✓ Integration tests для API endpoints
✓ Database tests (PostgreSQL test instance)
✓ Webhook tests (Tribute mock)
✓ Rate limit tests
```

### Frontend Testing
```
✓ Component tests (React Testing Library)
✓ Integration tests (Next.js)
✓ E2E tests (Playwright)
  - Register → Email verification → Login
  - Buy plan → Webhook → Balance update
  - Get license key → Use in extension
```

### Extension Testing
```
✓ Manual testing in Discord (primary)
✓ Unit tests для utility functions
✓ Mock Discord DOM для тестов
✓ E2E flow: Key validation → Send prompts → Error handling
✓ Encryption tests (code obfuscation verification)
```

---

## 📦 DEPLOYMENT & CI/CD

### GitHub Actions Pipeline
```
1. On push to develop:
   ✓ Lint (ESLint, Black)
   ✓ Type check (mypy, TypeScript)
   ✓ Unit tests (pytest, Jest)
   ✓ Build (Next.js, FastAPI)

2. On push to main:
   ✓ All above tests
   ✓ Deploy frontend to Vercel
   ✓ Deploy backend to Railway
   ✓ Run migrations (Alembic)
   ✓ Smoke tests (quick health check)

3. Security:
   ✓ SAST (Snyk, Semgrep)
   ✓ Dependency audit
   ✓ Secret scanning
```

### Release Process
```
Feature branches → develop → main → production
- Develop: staging environment
- Main: production (auto-deploy)
- Tag versions (v1.0.0, v1.0.1, v1.1.0)
```

---

## 📝 DOCUMENTATION

### For Users
```
✓ Landing page (how it works)
✓ User guide (PDF + Markdown)
✓ Video tutorial (YouTube or Loom)
✓ FAQ section
✓ Email support template
```

### For Developers
```
✓ API docs (Swagger UI)
✓ Frontend setup guide (README)
✓ Backend setup guide (README)
✓ Extension build guide (how to compile to EXE)
✓ Database schema (ER diagram)
✓ Development workflow (Git, branches)
✓ Deployment runbook (Vercel, Railway)
✓ Troubleshooting guide
```

### For Admins
```
✓ Admin panel documentation
✓ User management guide
✓ Backup & recovery procedure
✓ Monitoring dashboards (Grafana)
✓ Error tracking (Sentry)
✓ Database maintenance
```

---

## 🚀 SUCCESS METRICS

### Performance
```
✓ API response time < 200ms (p95)
✓ Frontend Lighthouse score > 90
✓ Extension popup load < 500ms
✓ Database query time < 100ms (p95)
```

### Reliability
```
✓ Uptime > 99.5%
✓ Error rate < 1%
✓ Extension failure rate < 0.1%
✓ Webhook success rate > 99%
```

### User Experience
```
✓ Registration time < 2 minutes
✓ Extension activation < 1 minute
✓ First prompt sent < 5 minutes
✓ NPS score > 50
```

### Business
```
✓ MVP launch on schedule (week 5)
✓ Payment integration working 100%
✓ 100+ users on day 1
✓ Runway for 6 months (burndown)
```

---

## 📅 TIMELINE

| Phase | Week | Component | Status |
|-------|------|-----------|--------|
| **MVP** | 1-2 | Backend | 🟡 In Progress |
| | 2-3 | Frontend | 🔴 Waiting |
| | 3-4 | Extension | 🔴 Waiting |
| | 4-5 | Integration & QA | 🔴 Waiting |
| **Polish** | 6-7 | Admin + Analytics | 🔴 Waiting |
| **Launch** | 8 | Production Release | 🔴 Waiting |

---

## 🎯 DEFINITION OF DONE

### Backend
- [ ] All endpoints implemented
- [ ] Unit tests > 80% coverage
- [ ] Database migrations working
- [ ] Redis caching implemented
- [ ] Sentry integrated
- [ ] Deployed to Railway
- [ ] Swagger docs complete

### Frontend
- [ ] All pages working
- [ ] OAuth Google integrated
- [ ] Email verification flow
- [ ] Payment flow (Tribute)
- [ ] Admin panel functional
- [ ] Responsive design
- [ ] Deployed to Vercel
- [ ] Performance optimized

### Extension
- [ ] Popup UI complete
- [ ] Discord integration working
- [ ] Error handling (3-error logic)
- [ ] Rate limit detection
- [ ] Session save/resume
- [ ] Compiled to EXE + encrypted
- [ ] E2E testing passed
- [ ] User manual written

### Infrastructure
- [ ] Cloudflare DNS configured
- [ ] GitHub Actions pipeline
- [ ] Backup strategy implemented
- [ ] Monitoring (Sentry + Grafana)
- [ ] Logging centralized
- [ ] Security review passed

---

**Версия:** 2.0  
**Последнее обновление:** December 22, 2025  
**Следующий шаг:** Начать Phase 1 (Backend)