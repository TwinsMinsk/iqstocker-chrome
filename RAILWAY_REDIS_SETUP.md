# Настройка Redis на Railway

## Текущий статус

✅ **Код интеграции готов** - Redis уже полностью интегрирован в backend
❌ **Не настроена переменная окружения** - `REDIS_URL` не установлена на Railway
⚠️ **Приложение работает в degraded режиме** - без кэширования и rate limiting

## Зачем нужен Redis

Redis используется для:
1. **Session storage** - хранение токенов сессий расширения
2. **Rate limiting** - защита от spam и DDoS
3. **Кэширование** - ускорение валидации лицензий
4. **Fingerprinting data** - хранение привязок устройств к лицензиям

## Шаг 1: Создание Redis на Railway

### Вариант A: Redis через Railway (рекомендуется)

1. **Откройте ваш проект на Railway**
   ```
   https://railway.app/project/<your-project-id>
   ```

2. **Добавьте новый сервис**
   - Нажмите "+ New" в правом верхнем углу
   - Выберите "Database" → "Add Redis"
   - Railway автоматически создаст Redis instance

3. **Получите REDIS_URL**
   - Кликните на созданный Redis сервис
   - Во вкладке "Variables" найдите `REDIS_URL`
   - Скопируйте значение (формат: `redis://default:<password>@<host>:<port>`)

### Вариант B: External Redis (альтернатива)

Если Railway Redis недоступен, используйте внешний сервис:

**Upstash (бесплатный tier):**
1. Зарегистрируйтесь на https://upstash.com
2. Создайте новую Redis базу (выберите регион близко к Railway)
3. Скопируйте `UPSTASH_REDIS_REST_URL` или обычный Redis URL

**Redis Cloud:**
1. Зарегистрируйтесь на https://redis.com/try-free
2. Создайте новую базу (выберите AWS us-east)
3. Скопируйте connection string

## Шаг 2: Настройка переменных окружения на Railway

1. **Откройте backend сервис на Railway**
   ```
   Project → backend-production-40040 → Variables
   ```

2. **Добавьте переменную REDIS_URL**
   
   **Если используете Railway Redis:**
   ```bash
   # Railway автоматически создаст связь между сервисами
   # Просто добавьте переменную с reference:
   REDIS_URL = ${{Redis.REDIS_URL}}
   ```

   **Если используете внешний Redis (Upstash/Redis Cloud):**
   ```bash
   REDIS_URL = redis://default:<password>@<host>:<port>
   ```

3. **Сохраните и дождитесь перезапуска**
   - Railway автоматически перезапустит backend
   - Проверьте логи на наличие "✅ Redis connected"

## Шаг 3: Проверка подключения

### 3.1 Через Health Check

```bash
curl https://backend-production-40040.up.railway.app/health
```

Ожидаемый ответ:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": "ok",
    "redis": "ok"  // <-- Должно быть "ok" вместо "error"
  }
}
```

### 3.2 Через Railway Logs

1. Откройте **backend сервис** → **Deployments** → **View Logs**
2. Найдите строку при старте:
   ```
   ✅ Redis connected: redis://default:***@redis.railway.internal:6379
   ```

### 3.3 Тест через API расширения

```bash
curl -X POST https://backend-production-40040.up.railway.app/api/v1/extensions/batch-validate \
  -H "Content-Type: application/json" \
  -d '{
    "license_key": "your-test-key",
    "prompts_count": 1
  }'
```

Если Redis работает, session будет сохранён в Redis.

## Шаг 4: Оптимизация конфигурации (опционально)

### 4.1 Увеличить таймауты для production

Обновите `backend/app/integrations/redis_client.py`:

```python
_redis_client = await aioredis.from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
    socket_connect_timeout=5,  # Увеличено с 2 до 5 секунд
    socket_timeout=5,          # Увеличено с 2 до 5 секунд
    retry_on_timeout=True,     # Повторные попытки при таймауте
    health_check_interval=30   # Health check каждые 30 секунд
)
```

### 4.2 Добавить connection pooling

```python
_redis_client = await aioredis.from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
    socket_connect_timeout=5,
    socket_timeout=5,
    max_connections=50,  # Максимум 50 соединений в пуле
    retry_on_timeout=True
)
```

### 4.3 Настроить persistence (для Railway Redis)

Railway Redis по умолчанию ephemeral (данные могут быть потеряны при рестарте).
Для production рекомендуется:

1. **Включить AOF persistence** (если доступно)
2. **Настроить snapshots**
3. **Или использовать внешний Redis с persistence**

## Типичные проблемы и решения

### Проблема 1: "Redis connection failed: Connection refused"

**Причина:** Неправильный REDIS_URL или Redis сервис не запущен

**Решение:**
1. Проверьте что Redis сервис запущен на Railway
2. Проверьте формат REDIS_URL: `redis://[username]:[password]@[host]:[port]/[db]`
3. Убедитесь что backend может достучаться до Redis (network policies)

### Проблема 2: "Redis connection timeout"

**Причина:** Медленная сеть или перегруженный Redis

**Решение:**
1. Увеличьте таймауты в `redis_client.py`
2. Проверьте нагрузку на Redis (Railway Metrics)
3. Рассмотрите upgrade Redis instance

### Проблема 3: "Redis not configured, running without cache"

**Причина:** REDIS_URL не установлена или пустая

**Решение:**
1. Добавьте `REDIS_URL` в переменные окружения Railway
2. Перезапустите backend сервис
3. Проверьте логи на наличие "✅ Redis connected"

### Проблема 4: "ERR Client sent AUTH, but no password is set"

**Причина:** В REDIS_URL указан пароль, но Redis не требует аутентификации

**Решение:**
Измените REDIS_URL на формат без пароля:
```bash
# Было:
REDIS_URL=redis://default:password@host:6379

# Должно быть:
REDIS_URL=redis://host:6379
```

## Мониторинг Redis

### Проверка использования памяти

Railway Dashboard → Redis Service → Metrics:
- Memory Usage
- CPU Usage
- Network I/O

### Проверка ключей через CLI

Если нужно посмотреть что хранится в Redis:

```bash
# Подключиться к Redis на Railway
railway connect redis

# Список всех ключей
redis-cli KEYS "*"

# Просмотр session
redis-cli GET "ext_session:<token>"

# Просмотр rate limit
redis-cli GET "ext_rate_limit:<license>:<endpoint>"

# Просмотр bindings
redis-cli GET "ext_bindings:<license>"
```

## Рекомендации для Production

### 1. Включите Redis persistence
- AOF (Append Only File) для durability
- RDB snapshots для backup

### 2. Настройте maxmemory policy
```redis
maxmemory-policy allkeys-lru  # Удалять старые ключи при нехватке памяти
```

### 3. Мониторьте Redis health
- Настройте alerts на высокое использование памяти (>80%)
- Мониторьте latency (должна быть <5ms)
- Отслеживайте evicted keys

### 4. Используйте Redis для rate limiting
Текущая реализация использует Redis для:
```python
# Rate limit ключ живёт 60 секунд
await redis.setex(f"ext_rate_limit:{license}:batch", 60, 1)

# Session живёт 1 час
await redis.setex(f"ext_session:{token}", 3600, session_data)

# Bindings живут 7 дней
await redis.setex(f"ext_bindings:{license}", 604800, bindings_data)
```

## Следующие шаги

1. ✅ Создайте Redis на Railway
2. ✅ Добавьте `REDIS_URL` в переменные окружения
3. ✅ Перезапустите backend
4. ✅ Проверьте health endpoint
5. ⏳ Протестируйте расширение с Redis
6. ⏳ Настройте мониторинг

## Полезные команды

```bash
# Проверка Redis через Railway CLI
railway connect redis
redis-cli ping  # Должно вернуть PONG

# Просмотр всех переменных окружения
railway variables

# Просмотр логов backend
railway logs backend-production-40040

# Рестарт сервиса
railway restart backend-production-40040
```

## Итоговая конфигурация

После настройки Redis у вас должны быть:

**Railway Variables (backend):**
```
DATABASE_URL = <postgresql-url>
REDIS_URL = <redis-url>
SECRET_KEY = <your-secret>
SESSION_TOKEN_SECRET = <your-secret>
ENVIRONMENT = production
DEBUG = false
```

**Redis Services:**
```
Backend → Redis (internal network)
- Low latency (<5ms)
- Automatic failover
- Persistence enabled
```

**Health Status:**
```json
{
  "status": "ok",
  "services": {
    "database": "ok",
    "redis": "ok"
  }
}
```

---

**Дата создания:** 26 декабря 2025
**Автор:** AI Assistant
**Версия:** 1.0

