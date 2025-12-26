# Redis Setup - Финальное резюме

## Текущий статус ❌

**Redis НЕ настроен** - backend работает в degraded режиме

```json
{
  "status": "degraded",
  "services": {
    "database": "error: Textual SQL expression...",
    "redis": "error: object NoneType has no attribute..."
  }
}
```

**Что это значит:**
- ✅ Backend работает
- ✅ API endpoints доступны
- ❌ Redis отсутствует → нет session storage, rate limiting, кэширования
- ⚠️ Database warning → не критично, SQLAlchemy 2.0 deprecation warning

## Что нужно сделать

### 🎯 Задача: Настроить Redis на Railway (5 минут)

#### Шаг 1: Создать Redis на Railway

1. **Откройте Railway Dashboard:**
   ```
   https://railway.app/
   ```

2. **Найдите ваш проект** (там где backend-production-40040)

3. **Добавьте Redis:**
   - Нажмите **"+ New"** (кнопка в правом верхнем углу)
   - Выберите **"Database"**
   - Выберите **"Add Redis"**
   - Дождитесь создания (~30 секунд)

4. **Проверьте что Redis создан:**
   - Должен появиться новый сервис "Redis"
   - Статус должен быть зелёным ✅

#### Шаг 2: Подключить Redis к Backend

1. **Откройте backend сервис:**
   - Кликните на **backend-production-40040**

2. **Откройте Variables:**
   - Перейдите на вкладку **"Variables"**

3. **Добавьте переменную REDIS_URL:**
   - Нажмите **"+ New Variable"**
   - **Name:** `REDIS_URL`
   - **Value:** `${{Redis.REDIS_URL}}`
   - Нажмите **"Add"**

   **ВАЖНО:** Используйте именно такой формат с двумя фигурными скобками!
   Railway автоматически подставит URL созданного Redis сервиса.

4. **Дождитесь перезапуска:**
   - Backend автоматически перезапустится (~20 секунд)
   - Проверьте что deployment успешен (зелёный статус)

#### Шаг 3: Проверить что всё работает

**Вариант 1: Через браузер**
```
https://backend-production-40040.up.railway.app/health
```

Должно быть:
```json
{
  "status": "ok",
  "services": {
    "database": "ok",
    "redis": "ok"  // ✅ Главное!
  }
}
```

**Вариант 2: Через Railway Logs**
1. Backend → Deployments → View Logs
2. Найти строку: `✅ Redis connected: redis://***@...`
3. НЕ должно быть: `⚠️ Redis URL not configured`

## Альтернатива: Внешний Redis

Если Railway Redis недоступен в вашем плане:

### Вариант A: Upstash (рекомендуется)

1. **Регистрация:**
   ```
   https://upstash.com
   ```

2. **Создание базы:**
   - Create Database
   - Name: `iqstocker-redis`
   - Region: `us-east-1` (ближе к Railway)
   - Type: `Regional` (бесплатно)

3. **Получение URL:**
   - Скопируйте **Redis Connect URL**
   - Формат: `redis://default:xxx@xxx.upstash.io:6379`

4. **В Railway Variables:**
   - Name: `REDIS_URL`
   - Value: `<скопированный URL из Upstash>`

### Вариант B: Redis Cloud

1. **Регистрация:**
   ```
   https://redis.com/try-free
   ```

2. **Создание базы:**
   - Create subscription → Free
   - Cloud: AWS
   - Region: `us-east-1`
   - Database name: `iqstocker`

3. **Получение URL:**
   - Database → Configuration → Public endpoint
   - Формат: `redis://default:xxx@xxx.cloud.redislabs.com:xxx`

4. **В Railway Variables:**
   - Name: `REDIS_URL`
   - Value: `<скопированный URL из Redis Cloud>`

## Что улучшит Redis

### До настройки (текущее состояние)
- ❌ Session tokens не хранятся → каждый запрос требует валидацию
- ❌ Rate limiting не работает → уязвимость к спаму
- ❌ Кэширование отключено → медленные запросы
- ❌ Fingerprinting не работает → нельзя привязать устройства

### После настройки
- ✅ Session storage → токены живут 1 час
- ✅ Rate limiting → 1 запрос/минуту на batch-validate
- ✅ Кэширование → быстрая валидация лицензий
- ✅ Fingerprinting → защита от кражи лицензий

## Производительность

**Без Redis:**
```
Batch validation: ~500ms (каждый раз полная проверка)
Deduct credit: FAIL (нет session storage)
Finalize session: FAIL (нет session storage)
```

**С Redis:**
```
Batch validation: ~500ms (первый раз) → ~50ms (кэш)
Deduct credit: ~20ms (быстрая проверка)
Finalize session: ~30ms (очистка данных)
```

## Troubleshooting

### "Redis connection failed"

**В логах:** `⚠️ Redis connection failed: Connection refused`

**Решение:**
1. Проверьте что Redis сервис запущен на Railway
2. Проверьте формат `REDIS_URL` (должен быть `${{Redis.REDIS_URL}}`)
3. Перезапустите backend: Railway Dashboard → Restart

### "REDIS_URL not configured"

**В логах:** `⚠️ REDIS_URL not configured`

**Решение:**
1. Добавьте переменную `REDIS_URL` в Variables
2. Используйте формат `${{Redis.REDIS_URL}}` для Railway Redis
3. Или полный URL для внешнего Redis

### "Redis timeout"

**В логах:** `socket timeout` или `connection timeout`

**Решение:**
Код уже оптимизирован (5с таймаут, retry, pooling).
Если проблема повторяется:
1. Проверьте регион Redis (должен быть us-east для Railway)
2. Проверьте нагрузку на Redis (Metrics)
3. Увеличьте timeout в `redis_client.py` до 10 секунд

## Проверка настройки

### ✅ Checklist

Убедитесь что:

- [ ] Redis создан на Railway (или внешний сервис)
- [ ] `REDIS_URL` добавлена в backend Variables
- [ ] Backend успешно перезапущен
- [ ] В логах есть: `✅ Redis connected`
- [ ] Health endpoint показывает: `"redis": "ok"`
- [ ] Нет ошибок в логах при запросах

### 🧪 Тесты

**Test 1: Health Check**
```bash
curl https://backend-production-40040.up.railway.app/health
```
Ожидается: `"redis": "ok"`

**Test 2: Extensions Health**
```bash
curl https://backend-production-40040.up.railway.app/api/v1/extensions/health
```
Ожидается: `{"status":"ok"}`

**Test 3: Batch Validate (создание сессии)**
```bash
curl -X POST https://backend-production-40040.up.railway.app/api/v1/extensions/batch-validate \
  -H "Content-Type: application/json" \
  -d '{"license_key":"test-key","prompts_count":5}'
```
Ожидается: `{"allowed":true,"session_token":"..."}` (если лицензия валидна)

**Test 4: Проверка что сессия сохранена в Redis**
- Если получили `session_token` в Test 3 → Redis работает!
- Сессия будет использована для deduct-credit и finalize-session

## Файлы для справки

- 📖 **Подробное руководство:** `RAILWAY_REDIS_SETUP.md`
- ⚡ **Быстрый старт:** `REDIS_QUICK_START.md`
- 🔧 **Код интеграции:** `backend/app/integrations/redis_client.py`
- ⚙️ **Конфигурация:** `backend/app/core/config.py`
- 🧪 **Тесты:** `backend/tests/test_extension.py`

## Следующие шаги

1. ✅ **Настройте Redis** (следуйте Шагам 1-3 выше)
2. ✅ **Проверьте health endpoint**
3. ✅ **Протестируйте расширение** с Redis
4. 🔜 **Настройте мониторинг** (алерты на память/CPU)
5. 🔜 **Настройте backup** Redis (если используете данные длительного хранения)

## Важные замечания

⚠️ **Railway Redis ephemeral** - данные могут быть потеряны при рестарте.
Для критичных данных используйте:
- External Redis с persistence (Upstash, Redis Cloud)
- Или дублируйте важные данные в PostgreSQL

✅ **Session storage не критичен** - сессии живут 1 час, потеря данных не страшна.
Расширение просто создаст новую сессию.

✅ **Rate limiting восстановится** - после рестарта Redis rate limits сбросятся,
но это не проблема для production.

---

**Дата:** 26 декабря 2025
**Статус:** 🔴 Redis не настроен (требуется действие)
**Время настройки:** 5 минут
**Приоритет:** Высокий (для production)

