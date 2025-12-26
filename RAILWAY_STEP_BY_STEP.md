# 🚂 ПОШАГОВАЯ ИНСТРУКЦИЯ: ДЕПЛОЙ НА RAILWAY

> **Визуальное руководство с скриншотами и командами**

---

## 📋 ЧТО МЫ БУДЕМ ДЕЛАТЬ

1. ✅ Создадим PostgreSQL базу данных на Railway
2. ✅ Развернем Backend (FastAPI)
3. ✅ Развернем Frontend (Next.js)
4. ✅ Настроим переменные окружения
5. ✅ Применим миграции БД
6. ✅ Протестируем работу

**Время**: ~15 минут  
**Стоимость**: Бесплатно (Railway дает $5 кредитов в месяц)

---

## 🎯 ШАГ 1: ПОДГОТОВКА (2 минуты)

### 1.1. Убедитесь, что код в Git

```bash
# Проверьте статус
git status

# Если есть изменения, закоммитьте
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

### 1.2. Сгенерируйте секретные ключи

**Для Windows (PowerShell):**

Выполните в PowerShell **3 раза**:

```powershell
-join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

**Или используйте Python (если установлен):**

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

**Или установите OpenSSL для Windows:**

1. Скачайте: https://slproweb.com/products/Win32OpenSSL.html
2. Установите
3. Затем используйте: `openssl rand -hex 32`

**Сохраните 3 ключа:**
- Ключ 1 → для `SECRET_KEY` (Backend)
- Ключ 2 → для `SESSION_TOKEN_SECRET` (Backend)
- Ключ 3 → для `NEXTAUTH_SECRET` (Frontend)

---

## 🚂 ШАГ 2: СОЗДАНИЕ RAILWAY ПРОЕКТА (3 минуты)

### 2.1. Создайте аккаунт

1. Откройте https://railway.app
2. Нажмите **"Start a New Project"**
3. Войдите через **GitHub** (рекомендуется)

### 2.2. Создайте новый проект

1. Нажмите **"New Project"**
2. Выберите **"Deploy from GitHub repo"**
3. Выберите ваш репозиторий `Perplexity Cursor` (или как он называется)
4. Нажмите **"Deploy Now"**

### 2.3. Добавьте PostgreSQL базу данных

1. В вашем проекте нажмите **"+ New"** (справа вверху)
2. Выберите **"Database"**
3. Выберите **"Add PostgreSQL"**
4. Railway автоматически создаст базу данных

### 2.4. Получите DATABASE_URL

1. Откройте созданный PostgreSQL сервис (кликните на него)
2. Перейдите на вкладку **"Variables"**
3. Найдите переменную **`DATABASE_URL`**
4. Нажмите на значок **👁️** (показать значение)
5. **Скопируйте значение** - это ваш connection string

**Пример:**
```
postgresql://postgres:abc123@containers-us-west-123.railway.app:5432/railway
```

**Сохраните этот URL** - он понадобится для Backend!

---

## 🔧 ШАГ 3: ДЕПЛОЙ BACKEND (5 минут)

### 3.1. Создайте Backend сервис

1. В вашем Railway проекте нажмите **"+ New"**
2. Выберите **"GitHub Repo"**
3. Выберите ваш репозиторий
4. Railway начнет деплой

### 3.2. Настройте Root Directory

**ВАЖНО!** Нужно указать, что Backend находится в папке `backend`:

1. Откройте созданный сервис (кликните на него)
2. Перейдите на вкладку **"Settings"**
3. Найдите раздел **"Source"**
4. В поле **"Root Directory"** введите: `backend`
5. Нажмите **"Save"**

Railway автоматически перезапустит деплой.

### 3.3. Настройте переменные окружения

1. В Backend сервисе перейдите на вкладку **"Variables"**
2. Нажмите **"+ New Variable"**
3. Добавьте следующие переменные **по одной**:

#### Переменная 1: DATABASE_URL
```
Name: DATABASE_URL
Value: [вставьте DATABASE_URL из шага 2.4]
```

#### Переменная 2: USE_SQLITE
```
Name: USE_SQLITE
Value: false
```

#### Переменная 3: SECRET_KEY
```
Name: SECRET_KEY
Value: [вставьте Ключ 1 из шага 1.2]
```

#### Переменная 4: SESSION_TOKEN_SECRET
```
Name: SESSION_TOKEN_SECRET
Value: [вставьте Ключ 2 из шага 1.2]
```

#### Переменная 5: JWT_ALGORITHM
```
Name: JWT_ALGORITHM
Value: HS256
```

#### Переменная 6: JWT_EXPIRY_DAYS
```
Name: JWT_EXPIRY_DAYS
Value: 30
```

#### Переменная 7: ENVIRONMENT
```
Name: ENVIRONMENT
Value: production
```

#### Переменная 8: DEBUG
```
Name: DEBUG
Value: false
```

#### Переменная 9: API_V1_PREFIX
```
Name: API_V1_PREFIX
Value: /api/v1
```

#### Переменная 10: PORT
```
Name: PORT
Value: 8000
```

**Пока не добавляйте CORS_ORIGINS и ALLOWED_HOSTS** - мы добавим их после получения URL.

### 3.4. Дождитесь деплоя

1. Перейдите на вкладку **"Deployments"**
2. Дождитесь, пока статус станет **"Success"** (зеленая галочка)
3. Это может занять 2-5 минут

### 3.5. Получите Backend URL

1. Перейдите на вкладку **"Settings"**
2. Найдите раздел **"Networking"**
3. Найдите **"Public Domain"**
4. **Скопируйте URL** (например: `your-backend-production.up.railway.app`)

**Сохраните этот URL!**

### 3.6. Обновите CORS переменные

Теперь, когда у вас есть Backend URL, обновите переменные:

1. В **"Variables"** найдите или создайте:
   ```
   Name: CORS_ORIGINS
   Value: ["https://your-backend-production.up.railway.app"]
   ```
   (Замените на ваш реальный URL)

2. Создайте:
   ```
   Name: ALLOWED_HOSTS
   Value: ["your-backend-production.up.railway.app"]
   ```
   (Замените на ваш реальный URL)

Railway автоматически перезапустит сервис.

### 3.7. Примените миграции базы данных

**Установите Railway CLI:**

```bash
npm i -g @railway/cli
```

**Войдите в Railway:**

```bash
railway login
```

**Подключитесь к проекту:**

```bash
cd backend
railway link
```

Выберите ваш проект и Backend сервис.

**Примените миграции:**

```bash
railway run alembic upgrade head
```

Должно появиться:
```
INFO  [alembic.runtime.migration] Running upgrade 001 -> 002, Add telegram_user_id to users
```

---

## 🎨 ШАГ 4: ДЕПЛОЙ FRONTEND (5 минут)

### 4.1. Создайте Frontend сервис

1. В Railway проекте нажмите **"+ New"**
2. Выберите **"GitHub Repo"**
3. Выберите ваш репозиторий (тот же)
4. Railway начнет деплой

### 4.2. Настройте Root Directory

**ВАЖНО!** Укажите папку `frontend`:

1. Откройте Frontend сервис
2. **"Settings"** → **"Source"**
3. **"Root Directory"**: `frontend`
4. **"Save"**

### 4.3. Настройте переменные окружения

В Frontend сервисе → **"Variables"** → Добавьте:

#### Переменная 1: NEXT_PUBLIC_API_URL
```
Name: NEXT_PUBLIC_API_URL
Value: https://your-backend-production.up.railway.app/api/v1
```
(Замените на ваш реальный Backend URL из шага 3.5)

#### Переменная 2: NEXTAUTH_SECRET
```
Name: NEXTAUTH_SECRET
Value: [вставьте Ключ 3 из шага 1.2]
```

#### Переменная 3: NODE_ENV
```
Name: NODE_ENV
Value: production
```

**Пока не добавляйте NEXTAUTH_URL** - добавим после получения Frontend URL.

### 4.4. Дождитесь деплоя

1. **"Deployments"** → дождитесь **"Success"**
2. Это может занять 3-7 минут (Next.js собирается дольше)

### 4.5. Получите Frontend URL

1. **"Settings"** → **"Networking"**
2. **"Public Domain"** → **Скопируйте URL**

**Сохраните этот URL!**

### 4.6. Обновите переменные

#### В Frontend:
1. Обновите `NEXTAUTH_URL`:
   ```
   Name: NEXTAUTH_URL
   Value: https://your-frontend-production.up.railway.app
   ```
   (Замените на ваш реальный Frontend URL)

#### В Backend:
1. Обновите `CORS_ORIGINS`:
   ```
   Name: CORS_ORIGINS
   Value: ["https://your-frontend-production.up.railway.app"]
   ```
   (Замените на ваш реальный Frontend URL)

Railway автоматически перезапустит оба сервиса.

---

## ✅ ШАГ 5: ПРОВЕРКА (2 минуты)

### 5.1. Проверьте Backend Health

Откройте в браузере:
```
https://your-backend-production.up.railway.app/health
```

**Ожидается:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": "ok"
  }
}
```

### 5.2. Проверьте Frontend

Откройте в браузере:
```
https://your-frontend-production.up.railway.app
```

Должна загрузиться главная страница.

### 5.3. Проверьте API Docs

```
https://your-backend-production.up.railway.app/api/docs
```

Должна открыться Swagger документация.

### 5.4. Функциональное тестирование

1. Откройте Frontend URL
2. Перейдите на `/register`
3. Создайте тестового пользователя:
   - Email: `test@test.com`
   - Password: `Test1234`
4. Войдите в систему
5. Проверьте Dashboard

---

## 🎉 ГОТОВО!

Ваш сервис развернут на Railway!

### Ваши URL:

- **Frontend**: `https://your-frontend-production.up.railway.app`
- **Backend API**: `https://your-backend-production.up.railway.app`
- **API Docs**: `https://your-backend-production.up.railway.app/api/docs`

### Что дальше:

1. ✅ Протестируйте все функции
2. ✅ Обновите расширение с новым API URL
3. ✅ Настройте кастомные домены (если нужно)

---

## 🐛 ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ

### Backend не запускается:

1. Проверьте логи: Backend → **"Deployments"** → **"View Logs"**
2. Проверьте, что все переменные окружения добавлены
3. Проверьте, что `DATABASE_URL` правильный
4. Убедитесь, что миграции применены

### Frontend не подключается к Backend:

1. Проверьте `NEXT_PUBLIC_API_URL` в Frontend variables
2. Проверьте CORS в Backend variables
3. Убедитесь, что Backend доступен: откройте `/health` в браузере

### Ошибка миграций:

```bash
cd backend
railway link
railway run alembic upgrade head
```

### CORS ошибки:

1. Убедитесь, что `CORS_ORIGINS` содержит точный Frontend URL
2. URL должен начинаться с `https://`
3. Не должно быть лишних пробелов

---

## 📚 ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ

- **Полное руководство**: [RAILWAY_DEPLOYMENT_GUIDE.md](RAILWAY_DEPLOYMENT_GUIDE.md)
- **Быстрый старт**: [RAILWAY_QUICK_START.md](RAILWAY_QUICK_START.md)
- **Railway Docs**: https://docs.railway.app

---

**Успешного деплоя! 🚀**

