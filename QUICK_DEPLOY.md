# ⚡ БЫСТРЫЙ ДЕПЛОЙ

> Краткая инструкция для запуска в production за 5 минут

---

## 🚀 Windows (PowerShell)

```powershell
# 1. Настроить environment variables
Copy-Item backend\env.example backend\.env
Copy-Item frontend\env.example frontend\.env

# 2. ВАЖНО: Отредактировать .env файлы!
# - Сгенерировать секретные ключи: openssl rand -hex 32
# - Заменить yourdomain.com на ваш домен
# - Установить пароли для БД

notepad backend\.env
notepad frontend\.env

# 3. Запустить деплой
.\scripts\deploy.ps1

# 4. Проверить
curl http://localhost:8000/health
curl http://localhost:3000/api/health
```

---

## 🐧 Linux/Mac

```bash
# 1. Настроить environment variables
cp backend/env.example backend/.env
cp frontend/env.example frontend/.env

# 2. ВАЖНО: Отредактировать .env файлы!
# - Сгенерировать секретные ключи: openssl rand -hex 32
# - Заменить yourdomain.com на ваш домен
# - Установить пароли для БД

nano backend/.env
nano frontend/.env

# 3. Сделать скрипты исполняемыми
chmod +x scripts/*.sh
chmod +x backend/scripts/*.sh

# 4. Запустить деплой
./scripts/deploy.sh

# 5. Проверить
curl http://localhost:8000/health
curl http://localhost:3000/api/health
```

---

## 🔐 Обязательные настройки

### 1. Секретные ключи

```bash
# Сгенерировать
openssl rand -hex 32
```

Заменить в `backend/.env`:
```env
SECRET_KEY=ваш-сгенерированный-ключ
SESSION_TOKEN_SECRET=ваш-сгенерированный-ключ
```

В `frontend/.env`:
```env
NEXTAUTH_SECRET=ваш-сгенерированный-ключ
```

### 2. Домены

В `backend/.env`:
```env
CORS_ORIGINS=["https://yourdomain.com"]
```

В `frontend/.env`:
```env
NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1
```

---

## ✅ Проверка

Откройте в браузере:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/docs
- Health: http://localhost:8000/health

---

## 📚 Подробная инструкция

См. [PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md)

