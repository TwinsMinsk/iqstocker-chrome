# Исправление проблем с API на Railway

**Дата:** 30.12.2025  
**Проблема:** 404 ошибки на все эндпоинты админки и рефералов в production

---

## 🔍 Причины

1. **Неправильный API URL** - переменная `NEXT_PUBLIC_API_URL` на Railway не содержит префикс `/api/v1`
2. **Проблемы с типами данных** - UUID vs String при работе с PostgreSQL
3. **Отсутствие обработки ошибок** - при генерации referral_code

---

## ✅ Исправления

### 1. Автоматическая нормализация API URL

**Файл:** `frontend/services/api/client.ts`

Добавлена функция `normalizeApiBaseUrl()` которая:
- Автоматически добавляет `/api/v1` если его нет
- Работает с разными форматами URL (с префиксом и без)
- Поддерживает Railway формат: `https://backend-xxx.up.railway.app` → `https://backend-xxx.up.railway.app/api/v1`

**Результат:** Теперь не важно, что указано в `NEXT_PUBLIC_API_URL` - префикс `/api/v1` добавится автоматически.

---

### 2. Исправление типов данных в referral_service

**Файл:** `backend/app/services/referral_service.py`

Добавлена правильная обработка UUID/String в зависимости от типа БД:

```python
if settings.USE_SQLITE:
    user_id_filter = user_id  # String
else:
    user_id_filter = UUID(user_id)  # UUID для PostgreSQL
```

**Результат:** Запросы к referral stats работают корректно на PostgreSQL (Railway).

---

### 3. Улучшенная обработка ошибок

**Файл:** `backend/app/api/v1/endpoints/users.py`

- Добавлен try-catch для генерации referral_code
- Если генерация не удалась, эндпоинт всё равно возвращает статистику
- Логирование ошибок для диагностики

**Результат:** Эндпоинт не падает даже если есть проблемы с генерацией кода.

---

## 🚀 Настройка Railway

### Frontend Service

**Переменная окружения:**
```
NEXT_PUBLIC_API_URL=https://backend-production-4xxx.up.railway.app
```

**Важно:** Не нужно добавлять `/api/v1` - это сделает автоматически код!

### Backend Service

**Переменные окружения:**
```
DATABASE_URL=postgresql://...
API_V1_PREFIX=/api/v1
```

---

## ✅ Проверка после деплоя

1. **Открыть админ-панель** → `/admin`
2. **Проверить аналитику** → `/admin/analytics` (должна загрузиться без 404)
3. **Проверить промокоды** → `/admin/promocodes` (должен загрузиться список)
4. **Проверить рефералы** → `/dashboard/referral` (должна загрузиться статистика)

---

## 🐛 Если всё ещё есть 404

### 1. Проверить переменные окружения

В Railway Frontend Service:
```bash
# Должно быть:
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
# НЕ должно быть:
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app/api/v1  # ❌ Не нужно!
```

### 2. Проверить логи backend

В Railway Backend Service → Logs:
- Должны быть запросы к `/api/v1/admin/*`
- Не должно быть ошибок 404

### 3. Проверить Network tab в браузере

- Открыть DevTools → Network
- Проверить URL запросов
- Должно быть: `https://backend-xxx.up.railway.app/api/v1/admin/...`
- НЕ должно быть: `https://backend-xxx.up.railway.app/admin/...` (без `/api/v1`)

---

## 📝 Что было исправлено

| Файл | Изменение |
|------|-----------|
| `frontend/services/api/client.ts` | ✅ Автоматическая нормализация URL с добавлением `/api/v1` |
| `frontend/next.config.js` | ✅ Исправлен warning о `env.NEXT_PUBLIC_API_URL` |
| `backend/app/services/referral_service.py` | ✅ Правильная обработка UUID/String для PostgreSQL |
| `backend/app/api/v1/endpoints/users.py` | ✅ Улучшенная обработка ошибок в `/users/me/referral` |

---

**Статус:** ✅ Исправлено  
**Требуется:** Пересборка frontend и redeploy на Railway

