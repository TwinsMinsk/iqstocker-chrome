# Redis Quick Start - 5 минут до полной настройки

## TL;DR - Минимальные действия

```bash
# 1. Откройте Railway Dashboard
https://railway.app/project/<your-project-id>

# 2. Добавьте Redis: + New → Database → Add Redis

# 3. Добавьте переменную в backend:
REDIS_URL = ${{Redis.REDIS_URL}}

# 4. Проверьте:
curl https://backend-production-40040.up.railway.app/health
```

## Пошаговая инструкция (с картинками в голове)

### 1️⃣ Создание Redis (30 секунд)

**Railway Dashboard:**
1. Откройте ваш проект
2. Нажмите **"+ New"** (правый верхний угол)
3. Выберите **"Database"** → **"Add Redis"**
4. Дождитесь зелёного статуса ✅

### 2️⃣ Подключение к Backend (30 секунд)

**В backend сервисе:**
1. Откройте **Variables** tab
2. Нажмите **"+ New Variable"**
3. Введите:
   - **Name:** `REDIS_URL`
   - **Value:** `${{Redis.REDIS_URL}}`
4. Нажмите **"Add"**

Backend автоматически перезапустится (~20 секунд)

### 3️⃣ Проверка (10 секунд)

**Вариант A: Через curl**
```bash
curl https://backend-production-40040.up.railway.app/health
```

Должно быть:
```json
{
  "services": {
    "redis": "ok"  // ✅ Было "error", стало "ok"
  }
}
```

**Вариант B: Через Railway Logs**
1. Backend → Deployments → View Logs
2. Найти строку: `✅ Redis connected: redis://***@...`

## Что дальше?

✅ **Redis работает!** Теперь у вас:
- **Session storage** - токены расширений хранятся в Redis
- **Rate limiting** - защита от спама работает
- **Кэширование** - валидация лицензий быстрее
- **Fingerprinting** - привязка устройств работает

## Troubleshooting

### Проблема: "Redis connection failed"

```bash
# 1. Проверьте что Redis запущен
railway status redis

# 2. Проверьте переменную
railway variables | grep REDIS_URL

# 3. Перезапустите backend
railway restart backend-production-40040
```

### Проблема: "services.redis: error"

Возможные причины:
1. REDIS_URL не установлена → Добавьте переменную
2. Неправильный формат URL → Используйте `${{Redis.REDIS_URL}}`
3. Redis не запущен → Проверьте статус Redis сервиса
4. Network issues → Проверьте Railway network policies

### Проблема: "Redis timeout"

В логах: `socket timeout` или `connection timeout`

**Решение:**
Код уже оптимизирован для production (таймауты 5с, retry, pooling).
Если проблема повторяется:
1. Проверьте нагрузку на Redis (Metrics)
2. Рассмотрите upgrade Redis instance
3. Проверьте регион Redis (должен быть близко к backend)

## Альтернатива: Внешний Redis

Если Railway Redis недоступен или дорогой:

### Upstash (рекомендуется)
```bash
# 1. https://upstash.com → Create Database
# 2. Скопируйте Redis URL
# 3. В Railway: REDIS_URL = redis://default:<password>@<host>:<port>
```

**Плюсы:**
- Бесплатный tier (10K команд/день)
- Global edge network
- HTTP REST API (fallback)

### Redis Cloud
```bash
# 1. https://redis.com/try-free → Create Database
# 2. Скопируйте connection string
# 3. В Railway: REDIS_URL = <connection-string>
```

**Плюсы:**
- Бесплатный tier (30MB)
- AWS/GCP/Azure
- Persistence included

## Проверка работы

### Test 1: Health Check
```bash
curl https://backend-production-40040.up.railway.app/health | jq .services.redis
# Ожидается: "ok"
```

### Test 2: Extensions Health
```bash
curl https://backend-production-40040.up.railway.app/api/v1/extensions/health
# Ожидается: {"status":"ok"}
```

### Test 3: Session Storage
```bash
# Создать сессию через batch-validate
curl -X POST https://backend-production-40040.up.railway.app/api/v1/extensions/batch-validate \
  -H "Content-Type: application/json" \
  -d '{"license_key":"test","prompts_count":1}'

# В ответе должен быть session_token (значит Redis работает)
```

### Test 4: Redis CLI
```bash
# Подключиться к Redis
railway connect redis

# Проверить ключи
redis-cli KEYS "*"

# Должны быть ключи типа:
# - ext_session:*
# - ext_rate_limit:*
# - ext_bindings:*
```

## Мониторинг

**Railway Dashboard:**
- Redis → Metrics → Memory Usage (должно быть < 50MB для старта)
- Redis → Metrics → CPU Usage (должно быть < 10% в idle)
- Backend → Logs → Поиск "Redis" (не должно быть ошибок)

**Рекомендуемые алерты:**
- Memory > 80% → Consider upgrade
- Connection errors > 10/min → Check network
- Response time > 100ms → Check latency

## Команды для мониторинга

```bash
# Проверка подключения
railway run redis-cli ping

# Количество ключей
railway run redis-cli DBSIZE

# Информация о памяти
railway run redis-cli INFO memory

# Список активных подключений
railway run redis-cli CLIENT LIST

# Очистка всех ключей (осторожно!)
railway run redis-cli FLUSHALL
```

## Полезные ссылки

- 📖 [Подробная документация](RAILWAY_REDIS_SETUP.md)
- 🔧 [Скрипт настройки](scripts/setup-redis-railway.ps1)
- 🐛 [Troubleshooting](RAILWAY_REDIS_SETUP.md#типичные-проблемы-и-решения)
- 📊 [Railway Redis Docs](https://docs.railway.app/databases/redis)

## Checklist

- [ ] Redis создан на Railway
- [ ] `REDIS_URL` добавлена в backend variables
- [ ] Backend перезапущен
- [ ] Health check показывает `"redis": "ok"`
- [ ] В логах есть "✅ Redis connected"
- [ ] Расширение может создавать сессии
- [ ] Rate limiting работает

## Время на настройку

- ⚡ **Быстро (Railway):** 2-3 минуты
- 🔄 **Средне (Upstash):** 5-7 минут
- 🐢 **Долго (Redis Cloud):** 10-15 минут

---

**Последнее обновление:** 26 декабря 2025
**Статус:** ✅ Готово к использованию

