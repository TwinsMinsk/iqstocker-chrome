# ⚡ БЫСТРЫЙ СТАРТ: ДЕПЛОЙ НА RAILWAY ЗА 10 МИНУТ

> Краткая инструкция для быстрого развертывания

---

## 🎯 ПРЕДВАРИТЕЛЬНЫЕ ТРЕБОВАНИЯ

- ✅ GitHub репозиторий с вашим кодом
- ✅ Railway аккаунт (создайте на https://railway.app)

---

## 📝 ШАГ 1: ПОДГОТОВКА КОДА (2 минуты)

### 1.1. Убедитесь, что код закоммичен

```bash
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

### 1.2. Сгенерируйте секретные ключи

**Windows (PowerShell):**
```powershell
# Выполните 3 раза
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

Сохраните эти ключи - они понадобятся позже.

---

## 🚂 ШАГ 2: СОЗДАНИЕ ПРОЕКТА НА RAILWAY (3 минуты)

### 2.1. Создайте проект

1. Откройте https://railway.app
2. Войдите через GitHub
3. Нажмите **"New Project"**
4. Выберите **"Deploy from GitHub repo"**
5. Выберите ваш репозиторий

### 2.2. Добавьте PostgreSQL

1. В проекте нажмите **"+ New"**
2. Выберите **"Database"** → **"Add PostgreSQL"**
3. Откройте PostgreSQL сервис → **"Variables"**
4. **Скопируйте `DATABASE_URL`** - понадобится для Backend

---

## 🔧 ШАГ 3: ДЕПЛОЙ BACKEND (3 минуты)

### 3.1. Создайте Backend сервис

1. В проекте нажмите **"+ New"** → **"GitHub Repo"**
2. Выберите ваш репозиторий
3. **ВАЖНО**: В настройках укажите **Root Directory: `backend`**

### 3.2. Настройте переменные окружения

Откройте Backend сервис → **"Variables"** → Добавьте:

```env
# Database (из PostgreSQL)
DATABASE_URL=ваш-database-url-из-шага-2.2
USE_SQLITE=false

# Security (используйте сгенерированные ключи)
SECRET_KEY=ваш-ключ-1
SESSION_TOKEN_SECRET=ваш-ключ-2
JWT_ALGORITHM=HS256
JWT_EXPIRY_DAYS=30

# Environment
ENVIRONMENT=production
DEBUG=false

# CORS (обновите после получения URL)
CORS_ORIGINS=["https://your-backend.railway.app"]
ALLOWED_HOSTS=["your-backend.railway.app"]

# API
API_V1_PREFIX=/api/v1
PORT=8000
```

### 3.3. Получите Backend URL

1. После деплоя откройте **"Settings"** → **"Networking"**
2. Скопируйте **Public Domain** (например: `your-backend.railway.app`)

### 3.4. Примените миграции

**Через Railway CLI:**

```bash
# Установите Railway CLI
npm i -g @railway/cli

# Войдите
railway login

# Подключитесь к проекту
cd backend
railway link

# Примените миграции
railway run alembic upgrade head
```

**Или через Railway Dashboard:**

1. Откройте Backend сервис
2. **"Deployments"** → **"View Logs"**
3. В терминале выполните команду выше

---

## 🎨 ШАГ 4: ДЕПЛОЙ FRONTEND (2 минуты)

### 4.1. Создайте Frontend сервис

1. В проекте нажмите **"+ New"** → **"GitHub Repo"**
2. Выберите ваш репозиторий
3. **ВАЖНО**: Укажите **Root Directory: `frontend`**

### 4.2. Настройте переменные окружения

Откройте Frontend сервис → **"Variables"** → Добавьте:

```env
# API URL (используйте Backend URL из шага 3.3)
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1

# NextAuth (используйте сгенерированный ключ)
NEXTAUTH_SECRET=ваш-ключ-3
NEXTAUTH_URL=https://your-frontend.railway.app

# Environment
NODE_ENV=production
```

**Важно**: Замените `your-backend.railway.app` на реальный Backend URL!

### 4.3. Получите Frontend URL

1. После деплоя откройте **"Settings"** → **"Networking"**
2. Скопируйте **Public Domain**

### 4.4. Обновите CORS в Backend

1. Откройте Backend → **"Variables"**
2. Обновите `CORS_ORIGINS`:
   ```env
   CORS_ORIGINS=["https://your-frontend.railway.app"]
   ```
3. Обновите `NEXTAUTH_URL` в Frontend:
   ```env
   NEXTAUTH_URL=https://your-frontend.railway.app
   ```

---

## ✅ ШАГ 5: ПРОВЕРКА (1 минута)

### Проверьте Backend:

```
https://your-backend.railway.app/health
```

Должен вернуть: `{"status": "healthy", ...}`

### Проверьте Frontend:

```
https://your-frontend.railway.app
```

Должна загрузиться главная страница.

### Проверьте API Docs:

```
https://your-backend.railway.app/api/docs
```

---

## 🎉 ГОТОВО!

Ваш сервис развернут на Railway!

### Ваши URL:

- **Frontend**: `https://your-frontend.railway.app`
- **Backend API**: `https://your-backend.railway.app`
- **API Docs**: `https://your-backend.railway.app/api/docs`

### Следующие шаги:

1. Протестируйте регистрацию и логин
2. Проверьте работу расширения с новым API URL
3. Настройте кастомные домены (если нужно)

---

## 📚 ПОЛНАЯ ИНСТРУКЦИЯ

Для подробной информации см. [RAILWAY_DEPLOYMENT_GUIDE.md](RAILWAY_DEPLOYMENT_GUIDE.md)

---

## 🐛 ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ

### Backend не запускается:

1. Проверьте логи: Backend → **"Deployments"** → **"View Logs"**
2. Проверьте, что `DATABASE_URL` правильный
3. Убедитесь, что миграции применены

### Frontend не подключается к Backend:

1. Проверьте `NEXT_PUBLIC_API_URL` в Frontend variables
2. Проверьте CORS в Backend variables
3. Убедитесь, что Backend доступен по URL

### Ошибка миграций:

```bash
cd backend
railway run alembic upgrade head
```

---

**Успешного деплоя! 🚀**

