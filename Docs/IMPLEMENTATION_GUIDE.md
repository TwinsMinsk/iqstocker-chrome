# 🚀 IMPLEMENTATION GUIDE FOR CURSOR IDE
## Пошаговое руководство по разработке в Cursor

**Для:** Single developer, working solo  
**IDE:** Cursor AI  
**Approach:** Phase-based, feature-driven  

---

## 📂 ПРОЕКТНАЯ СТРУКТУРА

### Создайте эту структуру папок:

```
midjourney-auto/
├── backend/                          # FastAPI приложение
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI app entry
│   │   ├── core/
│   │   │   ├── config.py             # Env variables
│   │   │   ├── security.py           # JWT, bcrypt, OAuth
│   │   │   └── constants.py          # Constants
│   │   ├── db/
│   │   │   ├── session.py            # Database session
│   │   │   ├── base.py               # Base classes
│   │   │   └── init_db.py            # Init DB
│   │   ├── models/
│   │   │   ├── user.py               # User model
│   │   │   ├── subscription.py       # Subscription
│   │   │   ├── license_key.py        # License key
│   │   │   ├── transaction.py        # Transactions
│   │   │   └── extension_log.py      # Logs (NO PROMPTS!)
│   │   ├── schemas/
│   │   │   ├── user.py               # User schemas
│   │   │   ├── auth.py               # Auth schemas
│   │   │   ├── billing.py            # Billing schemas
│   │   │   └── common.py             # Common schemas
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       │   ├── auth.py       # Auth routes
│   │   │       │   ├── users.py      # User routes
│   │   │       │   ├── extensions.py # Extension routes
│   │   │       │   ├── billing.py    # Billing routes
│   │   │       │   ├── payments.py   # Webhooks
│   │   │       │   └── admin.py      # Admin routes
│   │   │       └── dependencies.py   # Shared deps
│   │   ├── services/
│   │   │   ├── auth_service.py       # Auth logic
│   │   │   ├── user_service.py       # User logic
│   │   │   ├── billing_service.py    # Billing logic
│   │   │   ├── payment_service.py    # Payments
│   │   │   └── extension_service.py  # Extension logic
│   │   ├── utils/
│   │   │   ├── security.py           # Security utils
│   │   │   ├── logger.py             # Logging setup
│   │   │   ├── email_service.py      # Email sending
│   │   │   └── validators.py         # Validators
│   │   ├── middleware/
│   │   │   ├── cors.py               # CORS
│   │   │   ├── rate_limit.py         # Rate limiting
│   │   │   └── error_handler.py      # Error handling
│   │   └── integrations/
│   │       ├── sentry_client.py      # Sentry init
│   │       ├── redis_client.py       # Redis client
│   │       └── tribute_client.py     # Tribute API
│   ├── migrations/                   # Alembic migrations
│   ├── tests/
│   │   ├── test_auth.py
│   │   ├── test_users.py
│   │   ├── test_billing.py
│   │   ├── test_extension.py
│   │   └── conftest.py
│   ├── .env.example
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── README.md
│
├── frontend/                         # Next.js приложение
│   ├── app/
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Home page
│   │   ├── register/
│   │   │   └── page.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx              # Main dashboard
│   │   │   ├── layout.tsx            # Auth layout
│   │   │   ├── billing/
│   │   │   │   └── page.tsx
│   │   │   ├── settings/
│   │   │   │   └── page.tsx
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx
│   │   │   └── payment-history/
│   │   │       └── page.tsx
│   │   ├── admin/
│   │   │   ├── page.tsx              # Admin dashboard
│   │   │   ├── layout.tsx            # Admin layout
│   │   │   ├── users/
│   │   │   │   └── [id]/page.tsx
│   │   │   └── logs/
│   │   │       └── page.tsx
│   │   ├── api/
│   │   │   └── auth/
│   │   │       ├── [...nextauth]/route.ts
│   │   │       └── callback/
│   │   │           └── google/route.ts
│   │   └── error.tsx
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── dashboard/
│   │   │   ├── BalanceCard.tsx
│   │   │   ├── SubscriptionCard.tsx
│   │   │   ├── LicenseKeyCard.tsx
│   │   │   ├── ExtensionDownload.tsx
│   │   │   ├── PaymentHistory.tsx
│   │   │   └── UsageAnalytics.tsx
│   │   ├── admin/
│   │   │   ├── UserTable.tsx
│   │   │   ├── UserActions.tsx
│   │   │   ├── LogViewer.tsx
│   │   │   └── BalanceEditor.tsx
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Loading.tsx
│   │   └── pricing/
│   │       ├── PricingCards.tsx
│   │       └── PricingModal.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useUser.ts
│   │   ├── useApi.ts
│   │   ├── usePayment.ts
│   │   └── useAdmin.ts
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.ts             # Axios setup
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── billing.ts
│   │   │   ├── admin.ts
│   │   │   └── extension.ts
│   │   └── storage.ts                # localStorage
│   ├── store/
│   │   ├── authStore.ts              # Zustand
│   │   ├── userStore.ts
│   │   └── uiStore.ts
│   ├── types/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   └── index.ts
│   ├── styles/
│   │   └── globals.css
│   ├── public/
│   │   ├── icons/
│   │   └── images/
│   ├── .env.local.example
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── package.json
│   └── README.md
│
├── extension/                        # Chrome расширение
│   ├── src/
│   │   ├── manifest.json             # MV3 manifest
│   │   ├── popup.html                # Popup UI
│   │   ├── popup.css
│   │   ├── popup.ts                  # Popup logic
│   │   ├── content.ts                # Content script
│   │   ├── service-worker.ts         # Background worker
│   │   ├── utils/
│   │   │   ├── api.ts                # API calls
│   │   │   ├── crypto.ts             # Encryption
│   │   │   ├── dom-helpers.ts        # Discord DOM
│   │   │   ├── logger.ts             # Logging (IndexedDB)
│   │   │   ├── storage.ts            # chrome.storage
│   │   │   └── validators.ts         # Input validation
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── constants/
│   │       ├── selectors.ts          # Discord selectors + fallbacks
│   │       ├── errors.ts
│   │       └── config.ts
│   ├── build/
│   │   ├── build.js                  # esbuild script
│   │   ├── encrypt.js                # Code encryption script
│   │   └── to-exe.py                 # PyInstaller script
│   ├── dist/                         # Built extension
│   │   └── (generated)
│   ├── tests/
│   │   ├── dom-helpers.test.ts
│   │   ├── api.test.ts
│   │   └── mocks/
│   │       └── discord-dom.mock.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── README.md
│
├── .github/
│   └── workflows/
│       ├── backend-tests.yml
│       ├── frontend-tests.yml
│       └── deploy.yml
│
├── docs/
│   ├── API.md                        # API documentation
│   ├── DATABASE.md                   # DB schema
│   ├── SETUP.md                      # How to setup locally
│   ├── DEPLOYMENT.md                 # Deployment guide
│   ├── EXTENSION-BUILD.md            # How to build extension
│   ├── ADMIN-GUIDE.md                # Admin panel guide
│   └── USER-GUIDE.md                 # End user guide
│
├── .gitignore
├── docker-compose.yml                # Local dev environment
└── README.md                          # Main README
```

---

## 🎯 PHASE 1: BACKEND (Недели 1-2)

### Шаг 1.1: Настройка проекта (День 1)

#### 1. Инициализируйте Git репо
```bash
git init
git branch develop
git checkout develop
git remote add origin <your-repo>
```

#### 2. Создайте .gitignore
```
__pycache__/
*.py[cod]
.env
.venv/
venv/
.DS_Store
.idea/
.vscode/
```

#### 3. Создайте requirements.txt
```
fastapi==0.104.0
uvicorn==0.24.0
sqlalchemy==2.0.23
alembic==1.12.1
pydantic==2.5.0
pydantic-settings==2.1.0
python-jose==3.3.0
passlib==1.7.4
bcrypt==4.1.1
python-multipart==0.0.6
httpx==0.25.2
psycopg2-binary==2.9.9
aioredis==2.0.1
redis==5.0.0
sentry-sdk==1.39.1
pydantic-email-validator==2.1.0
sendgrid==6.10.0
pytest==7.4.3
pytest-asyncio==0.21.1
```

#### 4. Создайте .env.example
```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/midjourney_auto
REDIS_URL=redis://localhost:6379

# JWT
SECRET_KEY=your-secret-key-generate-me
JWT_ALGORITHM=HS256
JWT_EXPIRY_DAYS=30

# OAuth Google
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-secret

# Telegram Tribute
TRIBUTE_API_KEY=your-api-key
TRIBUTE_WEBHOOK_SECRET=your-webhook-secret

# SendGrid
SENDGRID_API_KEY=your-api-key

# Sentry
SENTRY_DSN=your-sentry-dsn

# Environment
ENVIRONMENT=development
DEBUG=true
```

#### 5. Создайте app/main.py
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

from app.core.config import settings
from app.api.v1 import router as v1_router

# Initialize Sentry
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.1,
    )

app = FastAPI(
    title="Midjourney Auto API",
    description="API для сервиса автоматизации Midjourney",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS
)

# Routes
app.include_router(v1_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
```

### Шаг 1.2: Database & Models (День 1-2)

#### Используйте Cursor с промптом:
```
В Cursor: @Codebase

Промпт:
"Создай полные models для FastAPI приложения Midjourney Auto:
1. User model (id, email, password_hash, oauth_google_id, email_verified, is_admin, created_at)
2. Subscription model (id, user_id, plan_id, credits_balance, monthly_limit, used_this_month, expires_at)
3. LicenseKey model (id, user_id, key_hash, key_display, is_active, created_at, last_used_at)
4. Transaction model (id, user_id, amount, credits, type, status, payment_id, created_at)
5. ExtensionLog model (id, user_id, session_id, status, error_type, error_message, prompts_count, duration_seconds, timestamp)

НЕ СОХРАНЯЙ тексты промптов в БД!
Используй SQLAlchemy 2.0 с UUID primary keys, timestamp defaults.
Добавь методы is_expired() для подписок.
Файлы: app/models/user.py, subscription.py, license_key.py, transaction.py, extension_log.py"
```

#### Создайте Alembic миграцию
```bash
alembic init migrations
alembic revision --autogenerate -m "init schema"
alembic upgrade head
```

### Шаг 1.3: Authentication (День 2)

#### Используйте Cursor:
```
Промпт:
"Создай систему аутентификации для FastAPI:
1. app/core/security.py:
   - JWTHandler class (create/verify tokens)
   - password hashing с bcrypt
   - OAuth Google integration

2. app/api/v1/endpoints/auth.py:
   - POST /auth/register (email + password)
   - POST /auth/login (email + password)
   - POST /auth/refresh (refresh token)
   - POST /auth/logout
   - GET /auth/google/callback (OAuth)

3. app/services/auth_service.py:
   - create_user()
   - authenticate_user()
   - create_free_subscription() (50 кредитов)

Используй Pydantic для валидации.
Добавь email verification logic (отправка письма через SendGrid)."
```

---

### Шаг 1.4: Extension Security Endpoints (День 3) 🔥

#### НОВОЕ: Система защиты расширения

**Документация:** См. `SECURITY_PROTECTION_GUIDE.md`

Мы реализуем **многоуровневую защиту** с batch validation:

#### Уже реализовано:
- ✅ `app/schemas/extension.py` - Schemas для endpoints
- ✅ `app/services/extension_service.py` - Бизнес-логика защиты
- ✅ `app/api/v1/endpoints/extensions.py` - Защищённые endpoints
- ✅ `app/integrations/redis_client.py` - Redis для session storage
- ✅ `app/core/config.py` - Настройки защиты

#### Ключевые endpoints:
```python
# 1. Batch Validation (основной endpoint)
POST /api/v1/extensions/batch-validate
# Запрос разрешения на всю сессию, резервирование кредитов

# 2. Finalize Session
POST /api/v1/extensions/finalize-session
# Подтверждение использования, корректировка кредитов

# 3. Validate Key (legacy)
POST /api/v1/extensions/validate-key
# Простая проверка лицензии

# 4. Get Balance
GET /api/v1/extensions/balance
# Получить текущий баланс

# 5. Health Check
GET /api/v1/extensions/health
# Ultra-fast проверка доступности API
```

#### Инициализация Redis в main.py:
```python
# app/main.py
from app.integrations.redis_client import init_redis, close_redis

@app.on_event("startup")
async def startup_event():
    await init_redis()

@app.on_event("shutdown")
async def shutdown_event():
    await close_redis()
```

---

## 🎯 PHASE 1: FRONTEND (Недели 2-3)

### Шаг 2.1: Next.js Setup (День 1)

```bash
npx create-next-app@latest frontend --typescript --tailwind
cd frontend
```

#### .env.local.example
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
NEXTAUTH_SECRET=generate-with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
```

### Шаг 2.2: Components & Pages

#### Используйте Cursor:
```
Промпт:
"Создай Next.js компоненты для Midjourney Auto:

1. components/auth/LoginForm.tsx (email, password, OAuth Google button)
2. components/auth/RegisterForm.tsx (email, password, confirm password)
3. components/dashboard/BalanceCard.tsx (баланс, пополнить кнопка)
4. components/dashboard/SubscriptionCard.tsx (тариф, дата истечения)
5. components/dashboard/LicenseKeyCard.tsx (ключ, скопировать, новый)
6. components/dashboard/ExtensionDownload.tsx (скачать ZIP/EXE)
7. components/dashboard/PaymentHistory.tsx (таблица платежей)
8. components/dashboard/UsageAnalytics.tsx (график промптов)

Используй Tailwind CSS, shadcn/ui компоненты.
Все компоненты должны быть 'use client' для интерактивности.
Добавь loading states и error handling."
```

### Шаг 2.3: Layout & Pages

#### app/layout.tsx
```typescript
import type { Metadata } from 'next'
import { Providers } from '@/components/providers'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import './globals.css'

export const metadata: Metadata = {
  title: 'Midjourney Auto - Автоматизация промптов',
  description: 'Сервис для автоматической отправки промптов в Midjourney',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
```

#### Используйте Cursor для создания app/page.tsx (Landing)
```
Промпт:
"Создай landing page для Midjourney Auto с секциями:
1. Hero (заголовок, описание, CTA кнопки)
2. How it works (3 шага)
3. Pricing (3 тарифа с кнопками)
4. FAQ (5 вопросов)
5. Footer

Используй React components, Tailwind CSS.
Кнопки должны быть интерактивными (redirect на register/login)."
```

---

## 🎯 PHASE 1: EXTENSION (Недели 3-4)

### Шаг 3.1: Manifest & Popup

#### src/manifest.json (Chrome MV3)
```json
{
  "manifest_version": 3,
  "name": "Midjourney Auto",
  "version": "1.0.0",
  "description": "Автоматизируй отправку промптов в Midjourney",
  "permissions": [
    "storage",
    "webRequest",
    "tabs",
    "scripting"
  ],
  "host_permissions": [
    "https://discord.com/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "Midjourney Auto"
  },
  "background": {
    "service_worker": "service-worker.js"
  },
  "content_scripts": [
    {
      "matches": ["https://discord.com/*"],
      "js": ["content.js"],
      "run_at": "document_start"
    }
  ]
}
```

#### src/popup.html
```html
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Midjourney Auto</title>
    <link rel="stylesheet" href="popup.css">
</head>
<body>
    <div id="app" class="container">
        <!-- Будет заполнено React -->
    </div>
    <script src="popup.js"></script>
</body>
</html>
```

### Шаг 3.2: Popup React Component с защитой 🔐

#### ОБНОВЛЕНО: Использовать batch validation вместо простой валидации

**Документация:** См. `SECURITY_PROTECTION_GUIDE.md`

#### Создайте API клиент с batch validation:

**src/utils/api.ts:**
```typescript
import { ExtensionConfig } from '../types';

const API_BASE_URL = 'https://api.yourdomain.com/api/v1';

interface BatchValidateResponse {
  allowed: boolean;
  session_token?: string;
  expires_at?: string;
  config?: ExtensionConfig;
  credits_reserved?: number;
  credits_remaining?: number;
  error?: string;
  message?: string;
}

export class ExtensionAPI {
  
  /**
   * Batch validation - основной метод для защиты
   * Запрашивает разрешение на всю сессию
   */
  async batchValidate(
    licenseKey: string,
    promptsCount: number
  ): Promise<BatchValidateResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/extensions/batch-validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: licenseKey,
          prompts_count: promptsCount
        })
      });
      
      return await response.json();
    } catch (error) {
      // Graceful degradation - см. ниже
      return this.handleAPIError(error);
    }
  }
  
  /**
   * Финализация сессии после завершения
   */
  async finalizeSession(
    sessionToken: string,
    promptsSent: number,
    errorsCount: number = 0
  ): Promise<void> {
    await fetch(`${API_BASE_URL}/extensions/finalize-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_token: sessionToken,
        prompts_sent: promptsSent,
        errors_count: errorsCount
      })
    });
  }
  
  /**
   * Health check для graceful degradation
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/extensions/health`, {
        method: 'GET',
        timeout: 2000  // 2 seconds timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  /**
   * Graceful degradation - использовать кэш при недоступности API
   */
  private async handleAPIError(error: any): Promise<BatchValidateResponse> {
    const cached = await this.getCachedPermission();
    
    if (cached && Date.now() < cached.expires_at) {
      console.warn('⚠️ Using cached permission (API unavailable)');
      return cached;
    }
    
    throw new Error('API unavailable and cache expired');
  }
  
  private async getCachedPermission(): Promise<BatchValidateResponse | null> {
    const data = await chrome.storage.local.get('cached_permission');
    return data.cached_permission || null;
  }
}

export const api = new ExtensionAPI();
```

**src/utils/automation.ts:**
```typescript
import { api } from './api';
import { storage } from './storage';

export async function startAutomation(
  prompts: string[],
  licenseKey: string
): Promise<{ success: boolean; message?: string }> {
  
  try {
    // 1. Batch validation - ОДИН запрос для всей сессии
    const session = await api.batchValidate(licenseKey, prompts.length);
    
    if (!session.allowed) {
      return {
        success: false,
        message: session.message || 'Validation failed'
      };
    }
    
    // 2. Сохранить session token
    await storage.set('session_token', session.session_token);
    await storage.set('session_config', session.config);
    
    // 3. Отправлять промпты БЕЗ API запросов
    let sentCount = 0;
    let errorsCount = 0;
    
    for (let i = 0; i < prompts.length; i++) {
      try {
        await sendToDiscord(prompts[i]);
        sentCount++;
        
        // Интервал получаем с сервера
        if (i < prompts.length - 1) {
          await sleep(session.config.min_interval_ms);
        }
      } catch (error) {
        console.error(`Error sending prompt ${i + 1}:`, error);
        errorsCount++;
        
        if (errorsCount >= session.config.max_retries) {
          break;
        }
      }
    }
    
    // 4. Финализация сессии - ОДИН запрос в конце
    await api.finalizeSession(
      session.session_token,
      sentCount,
      errorsCount
    );
    
    return {
      success: true,
      message: `Successfully sent ${sentCount} prompts`
    };
    
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Unknown error'
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

#### Используйте Cursor для создания UI:
```
Промпт:
"Создай React компонент для popup расширения Chrome (TypeScript):

UI элементы:
1. License key input (validation, copy button)
2. Prompts textarea (multiline input)
3. Interval slider (получается с сервера, только для отображения)
4. Buttons: Start, Pause, Stop
5. Status display (текущий промпт #, прогресс)
6. Balance display (кредиты)
7. Logs list (последние 20 операций)

Функционал:
- Использовать startAutomation() из utils/automation.ts
- Показывать прогресс в реальном времени
- Graceful degradation (работать offline с кэшем)
- Экспортировать логи (CSV)

Используй TypeScript, модульную архитектуру.
Файлы: src/popup.tsx, src/components/PopupUI.tsx, src/utils/storage.ts"
```

### Шаг 3.3: Content Script (Discord Integration)

#### Используйте Cursor:
```
Промпт:
"Создай Content Script для Chrome расширения, который:

1. Находит input поле в Discord (с fallback селекторами):
   - Primary: 'textarea[placeholder*=\"Message\"]'
   - Secondary: 'div[contenteditable=\"true\"]'
   - Tertiary: 'form input[type=\"text\"]'

2. Находит кнопку Send:
   - Primary: 'button[aria-label=\"Send message\"]'
   - Secondary: 'button svg[class*=\"send\"]'

3. Отправляет промпты по одному с интервалом
4. Обнаруживает ошибки:
   - 429 (rate limit) → pause, увеличить интервал на 10сек
   - 503 (server error) → pause
   - Invalid prompt message → pause
5. Логирует в IndexedDB (НЕ СОХРАНЯТЬ ПРОМПТЫ, только метаданные)

Архитектура:
- sendPromptToDiscord() функция
- runAutomationLoop() с control flow (start/pause/stop)
- saveToIndexedDB() для логирования
- detectError() для обнаружения ошибок

Файлы: src/content.ts, src/utils/dom-helpers.ts, src/utils/logger.ts"
```

### Шаг 3.4: Build & Packaging to .crx

#### build/build.js (esbuild script)
```javascript
const esbuild = require('esbuild')
const path = require('path')

// Build extension files
esbuild.buildSync({
  entryPoints: {
    popup: 'src/popup.ts',
    content: 'src/content.ts',
    'service-worker': 'src/service-worker.ts'
  },
  outdir: 'dist',
  bundle: true,
  minify: true,
  target: 'es2020',
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})

// Copy manifest and assets
const fs = require('fs-extra')
fs.copySync('src/manifest.json', 'dist/manifest.json')
fs.copySync('src/icons', 'dist/icons')
fs.copySync('src/popup.html', 'dist/popup.html')
fs.copySync('src/popup.css', 'dist/popup.css')

console.log('✅ Extension built successfully in dist/')
```

#### build/package-crx.sh (Chrome packaging script)
```bash
#!/bin/bash

# This script packages the extension into .crx file with PEM key
# Run this ONLY when ready for distribution (end of development)

EXTENSION_DIR="./dist"
OUTPUT_DIR="./releases"
PRIVATE_KEY="./private-key.pem"
CRX_FILE="$OUTPUT_DIR/midjourney-auto.crx"

# Create output directory
mkdir -p $OUTPUT_DIR

# Generate PEM key if doesn't exist (FIRST TIME ONLY!)
if [ ! -f "$PRIVATE_KEY" ]; then
  echo "⚠️  Generating new PEM key..."
  echo "⚠️  ВАЖНО: Сохраните этот файл в безопасном месте!"
  echo "⚠️  Без него вы не сможете обновлять расширение!"
  
  # Chrome uses RSA keys for signing
  openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -out $PRIVATE_KEY
fi

# Package extension using Chrome
echo "📦 Packaging extension to .crx..."

# Method 1: Using Chrome CLI (recommended)
google-chrome \
  --pack-extension=$EXTENSION_DIR \
  --pack-extension-key=$PRIVATE_KEY \
  --no-message-box

mv "${EXTENSION_DIR}.crx" "$CRX_FILE"

echo "✅ Extension packaged: $CRX_FILE"
echo "✅ Extension ID: $(openssl rsa -in $PRIVATE_KEY -pubout -outform DER | openssl base64 -A | head -c 32 | tr '/+' '_-')"

# Method 2: Manual packaging (if Chrome CLI not available)
# You can also use: npm install -g crx
# crx pack $EXTENSION_DIR -p $PRIVATE_KEY -o $CRX_FILE
```

#### build/package-crx.bat (Windows version)
```batch
@echo off
REM Windows version of packaging script

SET EXTENSION_DIR=.\dist
SET OUTPUT_DIR=.\releases
SET PRIVATE_KEY=.\private-key.pem
SET CRX_FILE=%OUTPUT_DIR%\midjourney-auto.crx

REM Create output directory
if not exist %OUTPUT_DIR% mkdir %OUTPUT_DIR%

REM Check if private key exists
if not exist %PRIVATE_KEY% (
  echo ⚠️  Generating new PEM key...
  echo ⚠️  ВАЖНО: Сохраните этот файл в безопасном месте!
  openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -out %PRIVATE_KEY%
)

REM Package extension
echo 📦 Packaging extension to .crx...

"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --pack-extension=%EXTENSION_DIR% ^
  --pack-extension-key=%PRIVATE_KEY% ^
  --no-message-box

move "%EXTENSION_DIR%.crx" "%CRX_FILE%"

echo ✅ Extension packaged: %CRX_FILE%
```

#### ВАЖНО: Безопасность PEM ключа

**⚠️ КРИТИЧЕСКИ ВАЖНО:**
1. Файл `private-key.pem` должен храниться в безопасном месте
2. Добавьте `private-key.pem` в `.gitignore`
3. Без этого ключа вы не сможете выпускать обновления расширения
4. Extension ID привязан к этому ключу навсегда

**.gitignore:**
```
private-key.pem
releases/
*.crx
```

#### Установка расширения пользователями

1. Пользователь скачивает `midjourney-auto.crx` с вашего сайта
2. Открывает `chrome://extensions/`
3. Включает "Developer mode"
4. Перетаскивает `.crx` файл в окно Chrome
5. Chrome покажет предупреждение — пользователь должен нажать "Add extension"

**Альтернатива:** Можно также распространять как ZIP, который пользователи распаковывают и загружают через "Load unpacked"

---

## 🔄 PHASE 1: INTEGRATION & QA (Неделя 4-5)

### Шаг 4.1: E2E Testing

#### Используйте Cursor:
```
Промпт:
"Создай E2E тесты для Midjourney Auto используя Playwright:

Сценарии:
1. Register flow:
   - Перейти на /register
   - Ввести email + password
   - Отправить форму
   - Проверить email verification page
   - Кликнуть на ссылку в письме (mock)
   - Проверить редирект на dashboard

2. Login flow:
   - Перейти на /login
   - Ввести email + password
   - Проверить редирект на dashboard
   - Проверить отображение баланса

3. Extension flow:
   - Установить расширение
   - Ввести license key
   - Загрузить промпты
   - Кликнуть Start
   - Проверить отправку в mock Discord
   - Проверить логирование

Файл: tests/e2e.spec.ts"
```

### Шаг 4.2: Webhook Testing

#### Используйте Cursor:
```
Промпт:
"Создай тесты для Tribute webhook:

1. Создай mock Tribute API (используя httpretty)
2. Отправь POST на /payments/webhook/tribute с тестовой подписью
3. Проверь:
   - Signature verification passes
   - Credits начислены пользователю
   - Transaction created
   - Email отправлено (mock)

Файл: tests/test_payments.py"
```

### Шаг 4.3: Deployment

#### Deploy Backend to Railway
```bash
# Создайте Railway аккаунт
# Свяжите GitHub репо
# Railway автоматически деплоит на push к main

# Locально протестируйте:
docker-compose up -d
pytest tests/
```

#### Deploy Frontend to Railway
```bash
# Railway поддерживает Next.js из коробки
# 1. В Railway dashboard: New Project → Deploy from GitHub
# 2. Выберите папку frontend
# 3. Railway автоматически определит Next.js
# 4. Установите environment variables:
#    - NEXT_PUBLIC_API_URL=https://api.yourdomain.com
#    - NEXTAUTH_SECRET=your-secret
#    - NEXTAUTH_URL=https://yourdomain.com
# 5. Deploy автоматически запустится
```

---

## 📖 КАК ИСПОЛЬЗОВАТЬ CURSOR ДЛЯ УСКОРЕНИЯ

### Эффективные промпты для Cursor:

#### 1. Генерирование кода с контекстом
```
@Codebase

Промпт:
"Используя существующие модели (User, Subscription, LicenseKey),
создай endpoint GET /users/me который возвращает все данные пользователя.
Добавь JWT authentication requirement.
Используй Pydantic для response schema."
```

#### 2. Поиск и исправление
```
@Codebase

Промпт:
"Найди все места в коде где используется database session.
Добавь логирование SQL queries в Sentry.
Покажи изменения в diff формате."
```

#### 3. Генерирование тестов
```
@Codebase

Промпт:
"Для функции auth_service.create_user(), создай 5 unit тестов:
- Успешное создание user
- Duplicate email error
- Weak password error
- Email validation error
- Database error handling

Используй pytest + fixture pattern."
```

#### 4. Документирование
```
@Codebase

Промпт:
"Создай API документацию для всех endpoints в docs/API.md.
Включи: методы, пути, параметры, примеры запросов/ответов, коды ошибок.
Используй OpenAPI format."
```

### Советы для работы в Cursor:

1. **Используйте @Codebase** - это даёт Cursor контекст всего проекта
2. **Давайте файлы для редактирования** - "@file_name пожалуйста отредактируй X"
3. **Просите diff** - "покажи что ты изменил в diff формате"
4. **Бей на части** - разбивай большие задачи на маленькие промпты
5. **Итеративно улучшай** - "улучши обработку ошибок", "добавь логирование"

---

## ✅ CHECKLIST ДЛЯ КАЖДОЙ ФАЗЫ

### Phase 1 Completion
- [ ] Backend на Railway (health check работает)
- [ ] Frontend на Vercel (landing page live)
- [ ] Extension скомпилирована в EXE
- [ ] E2E тесты passing
- [ ] Webhook тесты passing
- [ ] Sentry интегрирована и логирует ошибки
- [ ] README для каждого компонента
- [ ] .env примеры для всех сервисов

---

**Начните с Шага 1.1 (Backend Setup) — всё готово для Cursor! 🚀**