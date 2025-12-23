# ✅ Чеклист проверки сервера

## 🔍 Что было исправлено:

1. **Отсутствие email-validator** ✅
   - Добавлен `email-validator==2.1.0` в `requirements.txt`
   - Установлен пакет

2. **Несовместимость типов UUID в ExtensionLog** ✅
   - Исправлено: теперь ExtensionLog использует тот же тип ID, что и User (UUID для PostgreSQL, String для SQLite)

3. **Ошибка подсчета total в list_logs** ✅
   - Исправлено: подсчет total теперь выполняется ДО применения limit

4. **Проблема с outerjoin в list_users** ✅
   - Исправлено: добавлен `distinct()` для корректного подсчета при сортировке по балансу

5. **Проблема с преобразованием user_id в update_user** ✅
   - Исправлено: используется отдельная переменная `user_id_typed` вместо изменения параметра

## 🧪 Что нужно проверить:

### 1. Запуск сервера
```bash
cd backend
python check_and_run.py
# или
python run_server.py
```

**Ожидаемый результат:**
- Сервер запускается без ошибок
- Видно сообщение: "✅ Все проверки пройдены!"
- Сервер слушает на `http://127.0.0.1:8000`

### 2. Health Check
```bash
curl http://127.0.0.1:8000/health
# или откройте в браузере: http://127.0.0.1:8000/health
```

**Ожидаемый ответ:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "environment": "development",
  "database": "connected"
}
```

### 3. API Documentation
Откройте в браузере:
- Swagger UI: http://127.0.0.1:8000/api/docs
- ReDoc: http://127.0.0.1:8000/api/redoc

**Проверьте:**
- Все endpoints отображаются
- Admin endpoints видны (GET /admin/users, PATCH /admin/users/{id}, GET /admin/logs)

### 4. Admin Endpoints (требуется авторизация админа)

#### 4.1. Создайте тестового админа
```python
# В Python shell или скрипте
from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

db = SessionLocal()
admin = User(
    email="admin@test.com",
    password_hash=get_password_hash("admin123"),
    is_admin=True,
    email_verified=True
)
db.add(admin)
db.commit()
```

#### 4.2. Получите токен
```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com", "password": "admin123"}'
```

#### 4.3. Проверьте GET /admin/users
```bash
curl http://127.0.0.1:8000/api/v1/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Ожидаемый ответ:**
```json
{
  "total": 1,
  "users": [...],
  "pagination": {...}
}
```

#### 4.4. Проверьте GET /admin/logs
```bash
curl http://127.0.0.1:8000/api/v1/admin/logs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Ожидаемый ответ:**
```json
{
  "total": 0,
  "logs": []
}
```

#### 4.5. Проверьте PATCH /admin/users/{id}
```bash
curl -X PATCH http://127.0.0.1:8000/api/v1/admin/users/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"balance": 1000}'
```

### 5. Проверка типов данных

#### 5.1. SQLite режим
Установите в `.env` или `app/core/config.py`:
```python
USE_SQLITE = True
```

Проверьте:
- Сервер запускается
- Admin endpoints работают
- Типы ID корректно обрабатываются (String вместо UUID)

#### 5.2. PostgreSQL режим
Установите:
```python
USE_SQLITE = False
DATABASE_URL = "postgresql://user:password@localhost:5432/dbname"
```

Проверьте:
- Сервер запускается
- Admin endpoints работают
- Типы ID корректно обрабатываются (UUID)

### 6. Проверка фильтрации и пагинации

#### 6.1. Поиск пользователей
```bash
curl "http://127.0.0.1:8000/api/v1/admin/users?search=test&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 6.2. Сортировка по балансу
```bash
curl "http://127.0.0.1:8000/api/v1/admin/users?sort=balance" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 6.3. Фильтрация логов
```bash
curl "http://127.0.0.1:8000/api/v1/admin/logs?status=error&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## ⚠️ Возможные проблемы:

### Проблема: "ModuleNotFoundError: No module named 'email_validator'"
**Решение:**
```bash
pip install email-validator
# или
pip install -r requirements.txt
```

### Проблема: "Database connection error"
**Решение:**
- Проверьте DATABASE_URL в `.env` или `config.py`
- Убедитесь, что база данных запущена
- Для SQLite: установите `USE_SQLITE = True`

### Проблема: "Redis connection failed"
**Решение:**
- Это не критично, сервер будет работать без Redis
- Redis опционален для кэширования

### Проблема: "403 Forbidden" при доступе к admin endpoints
**Решение:**
- Убедитесь, что пользователь имеет `is_admin = True`
- Проверьте, что токен валиден и не истек

## 📝 Логи для проверки:

Проверьте логи сервера на наличие:
- ✅ "✅ Redis connected" или "⚠️ Redis URL not configured"
- ✅ "INFO: Application startup complete"
- ❌ Любых ошибок импорта
- ❌ Ошибок подключения к БД
- ❌ Ошибок валидации

## 🎯 Где проверить:

1. **Backend сервер:** http://127.0.0.1:8000
2. **API Docs:** http://127.0.0.1:8000/api/docs
3. **Health Check:** http://127.0.0.1:8000/health
4. **Admin Endpoints:** 
   - GET /api/v1/admin/users
   - PATCH /api/v1/admin/users/{id}
   - GET /api/v1/admin/logs

## ✅ Критерии успешной проверки:

- [ ] Сервер запускается без ошибок
- [ ] Health check возвращает 200 OK
- [ ] API документация доступна
- [ ] Admin endpoints доступны (с токеном админа)
- [ ] Фильтрация и пагинация работают
- [ ] Обновление пользователя работает
- [ ] Логи отображаются корректно
- [ ] Нет ошибок в консоли сервера

