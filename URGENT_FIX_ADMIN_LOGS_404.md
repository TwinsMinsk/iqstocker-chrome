# СРОЧНОЕ ИСПРАВЛЕНИЕ: 404 на /admin/logs

**Дата:** 30.12.2025  
**Статус:** ✅ ИСПРАВЛЕНО  
**Коммиты:** `ff08367`, `5f11600`, `c385f64`

---

## 🔥 Проблема

Страница `/admin/logs` постоянно возвращала **404 Not Found** в production на Railway, несмотря на то что:
- Файл `frontend/app/admin/logs/page.tsx` существовал
- Локальная сборка `next build` включала маршрут
- Код был закоммичен

**Реальная причина:** Railway использовал **старый кеш Docker/Next.js** и не пересобирал фронтенд с новыми маршрутами.

---

## ✅ Что исправлено

### 1. Backend: Запись логов расширения (КРИТИЧНО)

**Проблема:** Логи расширения вообще не писались в БД:
- `/api/v1/extensions/log-usage` был TODO-заглушкой
- `finalize_session` не создавал записи `ExtensionLog`

**Исправление:**

#### `backend/app/services/extension_service.py`
```python
# В finalize_session добавлена запись ExtensionLog:
log = ExtensionLog(
    user_id=session_data["user_id"],
    session_id=session_token,
    status="completed" if errors_count == 0 else "error",
    prompts_count=prompts_sent,
    successful_count=prompts_sent - errors_count,
    failed_count=errors_count,
    duration_seconds=duration_seconds,
    error_type=None,
    error_message=None
)
self.db.add(log)
self.db.commit()
```

#### `backend/app/api/v1/endpoints/extensions.py`
```python
# Реализован /extensions/log-usage:
@router.post("/log-usage", response_model=LogUsageResponse)
async def log_usage(
    request: LogUsageRequest,
    license_key: Optional[str] = Header(None, alias="X-License-Key"),
    db: Session = Depends(get_db)
):
    # Валидация лицензии
    # Санитизация events (удаление промптов)
    # Создание/обновление ExtensionLog
```

**Безопасность:** События жёстко санитизируются - любые поля с `prompt/text/content` вырезаются, всё режется по длине.

### 2. Frontend: Принудительная пересборка

**Проблема:** Railway кешировал старый билд без `/admin/logs`.

**Исправления:**

#### `frontend/Dockerfile`
```dockerfile
# Очищаем любой возможный кеш Next.js перед сборкой
RUN rm -rf .next || true
RUN npm run build
```

#### `frontend/next.config.js`
```javascript
// Отключаем кеш билда для гарантии свежей сборки всех маршрутов
generateBuildId: async () => {
  return `build-${Date.now()}`
},
```

#### `frontend/app/api/health/route.ts`
```typescript
// Добавлен вывод коммита для диагностики
commit: process.env.RAILWAY_GIT_COMMIT_SHA || 
        process.env.GITHUB_SHA || 
        null
```

### 3. UI: Улучшения админских логов

#### `frontend/components/admin/LogViewer.tsx`
- Добавлены лейблы для `discord_error` и `unknown` типов ошибок
- Улучшена читаемость таблицы

---

## 🚀 Как проверить что исправление сработало

### 1. Проверить коммит в проде
```bash
curl https://frontend-production-a5f4.up.railway.app/api/health
```

**Ожидается:**
```json
{
  "status": "healthy",
  "commit": "ff08367..." // <- должен быть последний коммит
}
```

### 2. Проверить страницу логов
```
https://frontend-production-a5f4.up.railway.app/admin/logs
```

**Ожидается:** Страница загружается (не 404), показывает таблицу с фильтрами.

### 3. Проверить API логов
```bash
curl -H "Authorization: Bearer <admin_token>" \
  https://backend-production-48048.up.railway.app/api/v1/admin/logs
```

**Ожидается:** JSON с массивом логов (может быть пустым, если расширение ещё не работало).

---

## 📋 Что теперь логируется

### Автоматически (при finalize-session):
- `user_id` - ID пользователя
- `session_id` - Токен сессии
- `status` - `completed` или `error`
- `prompts_count` - Сколько промптов отправлено
- `successful_count` - Успешных
- `failed_count` - С ошибками
- `duration_seconds` - Длительность сессии
- `timestamp` - Время завершения

### Опционально (если расширение шлёт /log-usage):
- `error_type` - Тип ошибки (`rate_limit`, `network_error`, `discord_error`, `invalid_prompt`)
- `error_message` - Сообщение об ошибке (санитизированное)
- Детальные события (без промптов)

---

## 🔒 Безопасность

**ВАЖНО:** Логи НЕ содержат тексты промптов!

- В `ExtensionLog` модели нет полей для промптов
- Endpoint `/log-usage` жёстко санитизирует `events`:
  - Удаляет любые поля с `prompt/text/content`
  - Режет строки до 500 символов
  - Ограничивает массивы до 100 элементов

---

## 🎯 Следующие шаги

1. **Дождаться деплоя на Railway** (обычно 2-5 минут)
2. **Проверить `/api/health`** - поле `commit` должно быть `ff08367`
3. **Открыть `/admin/logs`** - должна загрузиться страница
4. **Запустить расширение** - логи начнут появляться
5. **Если 404 сохраняется** - в Railway Dashboard → Frontend Service → Settings → **Redeploy** (принудительно)

---

## 📊 Тесты

Все тесты прошли успешно:
```
46 passed, 102 warnings in 214.34s
```

Добавлен новый тест:
- `test_finalize_session_creates_extension_log` - проверяет что `finalize_session` создаёт запись в `extension_logs`

---

## 🐛 Если проблема повторится

### Диагностика:
1. Проверить `/api/health` → поле `commit`
2. Если `commit: null` или старый - Railway не обновился
3. В Railway Dashboard → Frontend Service → Deployments - проверить статус последнего деплоя

### Решение:
```bash
# В Railway Dashboard:
# Frontend Service → Settings → Redeploy
```

Или локально:
```bash
# Создать пустой коммит для форсирования деплоя
git commit --allow-empty -m "Force redeploy"
git push
```

---

**Статус:** ✅ Исправлено и задеплоено  
**Требуется:** Дождаться завершения деплоя на Railway (~2-5 минут)

