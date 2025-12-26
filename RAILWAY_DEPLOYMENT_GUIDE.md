# 🚂 ПОШАГОВЫЙ ДЕПЛОЙ НА RAILWAY

> **Полное руководство по развертыванию IQStocker на Railway**  
> **Версия**: 1.0.0  
> **Дата**: 25.12.2025

---

## 📋 СОДЕРЖАНИЕ

1. [Подготовка](#подготовка)
2. [Создание проекта на Railway](#создание-проекта-на-railway)
3. [Деплой PostgreSQL базы данных](#деплой-postgresql-базы-данных)
4. [Деплой Backend](#деплой-backend)
5. [Деплой Frontend](#деплой-frontend)
6. [Настройка переменных окружения](#настройка-переменных-окружения)
7. [Проверка работоспособности](#проверка-работоспособности)
8. [Настройка доменов](#настройка-доменов)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 ПОДГОТОВКА

### Что вам понадобится:

- ✅ GitHub аккаунт (если репозиторий на GitHub)
- ✅ Railway аккаунт (бесплатный tier доступен)
- ✅ Ваш код должен быть в Git репозитории

### Создайте Railway аккаунт:

1. Перейдите на https://railway.app
2. Нажмите **"Start a New Project"**
3. Войдите через GitHub (рекомендуется)

---

## 🗄️ ШАГ 1: СОЗДАНИЕ POSTGRESQL БАЗЫ ДАННЫХ

Railway предоставляет managed PostgreSQL, что очень удобно!

### 1.1. Создайте новый проект

1. В Railway dashboard нажмите **"New Project"**
2. Выберите **"Empty Project"** или **"Deploy from GitHub repo"** (если хотите сразу подключить репозиторий)

### 1.2. Добавьте PostgreSQL сервис

1. В вашем проекте нажмите **"+ New"**
2. Выберите **"Database"** → **"Add PostgreSQL"**
3. Railway автоматически создаст PostgreSQL базу данных

### 1.3. Получите connection string

1. Откройте созданную PostgreSQL базу
2. Перейдите на вкладку **"Variables"**
3. Найдите переменную **`DATABASE_URL`**
4. **Скопируйте значение** - это ваш connection string

**Пример:**
```
postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
```

### 1.4. Сохраните connection string

Сохраните этот `DATABASE_URL` - он понадобится для backend.

---

## 🚀 ШАГ 2: ДЕПЛОЙ BACKEND

### 2.1. Подготовка репозитория

Убедитесь, что ваш код закоммичен и запушен в Git:

```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### 2.2. Создайте Backend сервис в Railway

**Вариант A: Через GitHub (рекомендуется)**

1. В Railway проекте нажмите **"+ New"**
2. Выберите **"GitHub Repo"**
3. Выберите ваш репозиторий
4. **ВАЖНО**: В настройках **"Root Directory"** укажите: `backend`
5. Railway автоматически определит Dockerfile и начнет деплой

**Вариант B: Через Railway CLI**

```bash
# Установите Railway CLI
npm i -g @railway/cli

# Войдите
railway login

# Инициализируйте проект
cd backend
railway init

# Свяжите с существующим проектом или создайте новый
railway link

# Деплой
railway up
```

### 2.3. Настройте переменные окружения для Backend

1. Откройте ваш Backend сервис в Railway
2. Перейдите на вкладку **"Variables"**
3. Добавьте следующие переменные:

#### Обязательные переменные:

```env
# Database (из PostgreSQL сервиса)
DATABASE_URL=postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
USE_SQLITE=false

# Security (СГЕНЕРИРУЙТЕ НОВЫЕ!)
SECRET_KEY=ваш-сгенерированный-ключ-32-символа
SESSION_TOKEN_SECRET=ваш-сгенерированный-ключ-32-символа
JWT_ALGORITHM=HS256
JWT_EXPIRY_DAYS=30

# Environment
ENVIRONMENT=production
DEBUG=false

# CORS (пока используйте Railway домен, потом замените)
CORS_ORIGINS=["https://your-backend.railway.app"]
ALLOWED_HOSTS=["your-backend.railway.app"]

# API
API_V1_PREFIX=/api/v1

# Port (Railway автоматически устанавливает PORT)
PORT=8000
```

#### Опциональные переменные:

```env
# Redis (если добавите Redis сервис)
REDIS_URL=redis://default:password@redis.railway.app:6379

# SendGrid (если используете email)
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Sentry (рекомендуется для production)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Telegram Tribute
TRIBUTE_API_KEY=your-tribute-api-key
TRIBUTE_WEBHOOK_SECRET=your-tribute-webhook-secret
```

**Как сгенерировать секретные ключи:**

**Windows (PowerShell):**
```powershell
-join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

**Или Python:**
```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

**Linux/Mac:**
```bash
openssl rand -hex 32
```

### 2.4. Настройте Railway для Backend

1. В настройках сервиса найдите **"Settings"**
2. Убедитесь, что:
   - **Root Directory**: `backend`
   - **Build Command**: (оставьте пустым, Railway использует Dockerfile)
   - **Start Command**: (оставьте пустым, используется из Dockerfile)

### 2.5. Запустите миграции

После первого деплоя нужно применить миграции:

**Через Railway CLI:**

```bash
cd backend
railway run alembic upgrade head
```

**Или через Railway Dashboard:**

1. Откройте ваш Backend сервис
2. Перейдите на вкладку **"Deployments"**
3. Найдите последний deployment
4. Нажмите **"View Logs"**
5. В терминале выполните:

```bash
railway run alembic upgrade head
```

### 2.6. Получите Backend URL

1. После деплоя Railway автоматически создаст домен
2. Откройте вкладку **"Settings"** → **"Networking"**
3. Скопируйте **Public Domain** (например: `your-backend.railway.app`)
4. Это ваш Backend API URL

---

## 🎨 ШАГ 3: ДЕПЛОЙ FRONTEND

### 3.1. Создайте Frontend сервис

1. В том же Railway проекте нажмите **"+ New"**
2. Выберите **"GitHub Repo"** (тот же репозиторий)
3. **ВАЖНО**: В настройках **"Root Directory"** укажите: `frontend`
4. Railway автоматически определит Next.js

### 3.2. Настройте переменные окружения для Frontend

1. Откройте Frontend сервис
2. Перейдите на вкладку **"Variables"**
3. Добавьте:

```env
# API URL (используйте Backend URL из шага 2.6)
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1

# NextAuth
NEXTAUTH_SECRET=ваш-сгенерированный-ключ-32-символа
NEXTAUTH_URL=https://your-frontend.railway.app

# Environment
NODE_ENV=production
```

**Важно**: `NEXT_PUBLIC_API_URL` должен указывать на ваш Backend URL!

### 3.3. Настройте Railway для Frontend

1. В настройках сервиса:
   - **Root Directory**: `frontend`
   - Railway автоматически определит Next.js

### 3.4. Получите Frontend URL

1. После деплоя откройте **"Settings"** → **"Networking"**
2. Скопируйте **Public Domain** (например: `your-frontend.railway.app`)

---

## 🔗 ШАГ 4: НАСТРОЙКА СВЯЗИ МЕЖДУ СЕРВИСАМИ

### 4.1. Обновите CORS в Backend

1. Откройте Backend сервис → **"Variables"**
2. Обновите `CORS_ORIGINS`:

```env
CORS_ORIGINS=["https://your-frontend.railway.app"]
```

3. Обновите `ALLOWED_HOSTS`:

```env
ALLOWED_HOSTS=["your-backend.railway.app"]
```

4. Railway автоматически перезапустит сервис

### 4.2. Обновите Frontend API URL

1. Откройте Frontend сервис → **"Variables"**
2. Обновите `NEXT_PUBLIC_API_URL`:

```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
```

3. Обновите `NEXTAUTH_URL`:

```env
NEXTAUTH_URL=https://your-frontend.railway.app
```

---

## ✅ ШАГ 5: ПРОВЕРКА РАБОТОСПОСОБНОСТИ

### 5.1. Проверьте Backend

Откройте в браузере:
```
https://your-backend.railway.app/health
```

Ожидается JSON:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": "ok",
    "redis": "not configured"
  }
}
```

### 5.2. Проверьте Frontend

Откройте в браузере:
```
https://your-frontend.railway.app
```

Должна загрузиться главная страница.

### 5.3. Проверьте API Docs

```
https://your-backend.railway.app/api/docs
```

Должна открыться Swagger документация.

### 5.4. Функциональное тестирование

1. **Регистрация**: Откройте `https://your-frontend.railway.app/register`
2. Создайте тестового пользователя
3. **Логин**: Войдите в систему
4. **Dashboard**: Проверьте загрузку дашборда

---

## 🌐 ШАГ 6: НАСТРОЙКА КАСТОМНЫХ ДОМЕНОВ (ОПЦИОНАЛЬНО)

Если у вас есть свой домен:

### 6.1. Настройте домен для Backend

1. Backend сервис → **"Settings"** → **"Networking"**
2. В разделе **"Custom Domain"** нажмите **"Add Domain"**
3. Введите ваш домен (например: `api.yourdomain.com`)
4. Добавьте CNAME запись в DNS:
   ```
   api.yourdomain.com → your-backend.railway.app
   ```

### 6.2. Настройте домен для Frontend

1. Frontend сервис → **"Settings"** → **"Networking"**
2. Добавьте домен (например: `yourdomain.com`)
3. Добавьте CNAME запись:
   ```
   yourdomain.com → your-frontend.railway.app
   ```

### 6.3. Обновите переменные окружения

После настройки доменов обновите:
- `CORS_ORIGINS` в Backend
- `NEXT_PUBLIC_API_URL` в Frontend
- `NEXTAUTH_URL` в Frontend

---

## 🔧 ШАГ 7: ДОПОЛНИТЕЛЬНЫЕ НАСТРОЙКИ

### 7.1. Добавьте Redis (опционально)

1. В Railway проекте → **"+ New"** → **"Database"** → **"Add Redis"**
2. Скопируйте `REDIS_URL` из Variables
3. Добавьте в Backend Variables:
   ```env
   REDIS_URL=redis://default:password@redis.railway.app:6379
   ```

### 7.2. Настройте автоматические деплои

Railway автоматически деплоит при push в main ветку, если:
- Репозиторий подключен через GitHub
- Автоматический деплой включен в настройках

### 7.3. Мониторинг

Railway предоставляет:
- **Logs**: Просмотр логов в реальном времени
- **Metrics**: CPU, Memory, Network usage
- **Deployments**: История деплоев

---

## 🐛 TROUBLESHOOTING

### Проблема: Backend не запускается

**Решение:**
1. Проверьте логи: Backend → **"Deployments"** → **"View Logs"**
2. Проверьте переменные окружения
3. Убедитесь, что `DATABASE_URL` правильный
4. Проверьте, что миграции применены

### Проблема: Frontend не подключается к Backend

**Решение:**
1. Проверьте `NEXT_PUBLIC_API_URL` в Frontend variables
2. Проверьте CORS настройки в Backend
3. Проверьте, что Backend доступен: `https://your-backend.railway.app/health`

### Проблема: Ошибка миграций

**Решение:**
```bash
# Через Railway CLI
cd backend
railway run alembic upgrade head

# Или откатите миграцию
railway run alembic downgrade -1
```

### Проблема: База данных недоступна

**Решение:**
1. Проверьте, что PostgreSQL сервис запущен
2. Проверьте `DATABASE_URL` в Backend variables
3. Убедитесь, что используете правильный connection string

### Проблема: CORS ошибки

**Решение:**
1. Обновите `CORS_ORIGINS` в Backend:
   ```env
   CORS_ORIGINS=["https://your-frontend.railway.app"]
   ```
2. Убедитесь, что URL точно совпадает (включая https://)

---

## 📊 СТРУКТУРА ПРОЕКТА НА RAILWAY

После деплоя у вас будет:

```
Railway Project: iqstocker
├── PostgreSQL (Database)
│   └── DATABASE_URL: postgresql://...
├── Backend (FastAPI)
│   └── URL: https://your-backend.railway.app
└── Frontend (Next.js)
    └── URL: https://your-frontend.railway.app
```

---

## 💰 СТОИМОСТЬ

### Railway Free Tier:
- ✅ $5 бесплатных кредитов в месяц
- ✅ Достаточно для тестирования
- ✅ PostgreSQL включен
- ✅ Автоматические деплои

### Рекомендации:
- Начните с Free tier
- Мониторьте использование через Railway dashboard
- При необходимости перейдите на Pro ($20/месяц)

---

## ✅ ЧЕК-ЛИСТ ДЕПЛОЯ

- [ ] Создан Railway аккаунт
- [ ] Создан PostgreSQL сервис
- [ ] Скопирован DATABASE_URL
- [ ] Создан Backend сервис
- [ ] Настроены все переменные окружения для Backend
- [ ] Применены миграции БД
- [ ] Backend доступен по URL
- [ ] Создан Frontend сервис
- [ ] Настроены переменные окружения для Frontend
- [ ] Frontend доступен по URL
- [ ] CORS настроен правильно
- [ ] Протестирована регистрация
- [ ] Протестирован логин
- [ ] API работает корректно

---

## 🎉 ГОТОВО!

Ваш сервис развернут на Railway и готов к тестированию!

### Следующие шаги:

1. **Протестируйте все функции**
2. **Настройте кастомные домены** (если нужно)
3. **Добавьте Redis** (если нужно кэширование)
4. **Настройте Sentry** для мониторинга ошибок
5. **Настройте автоматические backups** (Railway делает это автоматически)

### Полезные ссылки:

- Railway Dashboard: https://railway.app/dashboard
- Railway Docs: https://docs.railway.app
- Ваш Backend: `https://your-backend.railway.app`
- Ваш Frontend: `https://your-frontend.railway.app`

---

**Успешного деплоя! 🚀**

