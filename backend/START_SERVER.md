# 🚀 Запуск сервера БЕЗ Docker

## ✅ Быстрый запуск

### 1. Перейдите в папку backend:
```bash
cd backend
```

### 2. Запустите сервер:
```bash
python run_server.py
```

Или:
```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 3. Откройте в браузере:

- **Главная:** http://127.0.0.1:8000
- **Health check:** http://127.0.0.1:8000/health
- **API документация (Swagger):** http://127.0.0.1:8000/api/docs
- **ReDoc:** http://127.0.0.1:8000/api/redoc

---

## 📋 Что работает БЕЗ базы данных:

✅ FastAPI приложение запускается  
✅ Health check endpoint работает  
✅ API документация доступна  
✅ CORS настроен  
✅ Middleware работает  

❌ Endpoints с БД не работают (но сервер запускается)

---

## 🔧 Настройка базы данных (опционально)

### Вариант 1: Облачный PostgreSQL (рекомендуется)

**Railway:**
1. https://railway.app → New Project → PostgreSQL
2. Скопируйте `DATABASE_URL`
3. Создайте `backend/.env`:
   ```
   USE_SQLITE=false
   DATABASE_URL=postgresql://user:pass@host.railway.app:5432/railway
   SECRET_KEY=your-secret-key
   DEBUG=true
   ```
4. Примените миграции:
   ```bash
   alembic upgrade head
   ```

**Supabase (бесплатный):**
1. https://supabase.com → New Project
2. Settings → Database → Connection string
3. Скопируйте в `.env` как выше

### Вариант 2: SQLite (для простой разработки)

⚠️ Требует адаптации миграций (UUID → String)

1. Создайте `backend/.env`:
   ```
   USE_SQLITE=true
   DATABASE_URL=sqlite:///./iqstocker.db
   SECRET_KEY=your-secret-key
   DEBUG=true
   ```

2. Адаптируйте models для SQLite (см. DEVELOPMENT_WITHOUT_DOCKER.md)

---

## 🧪 Тестирование

Перед запуском сервера можно проверить импорты:

```bash
python test_server.py
```

Должно вывести:
```
[OK] Settings loaded
[OK] App imported successfully
[OK] Found X routes
```

---

## ⚠️ Устранение проблем

### Ошибка: "ModuleNotFoundError"

Установите зависимости:
```bash
pip install -r requirements.txt
```

### Ошибка: "Connection refused" (база данных)

Это нормально! Сервер работает без БД. Endpoints с БД не будут работать, но сам сервер запустится.

### Ошибка: "Port 8000 already in use"

Используйте другой порт:
```bash
python -m uvicorn app.main:app --reload --port 8001
```

---

## 📝 Следующие шаги

После успешного запуска сервера:

1. ✅ Сервер работает - можно продолжать разработку
2. ⏭️ Следующий шаг: Шаг 1.3 - Authentication (IMPLEMENTATION_GUIDE.md)
3. 🔧 Настроить БД когда понадобятся endpoints с данными

---

**Сервер готов к разработке! 🎉**

