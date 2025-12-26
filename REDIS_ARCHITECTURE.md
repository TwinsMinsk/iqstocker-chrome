# Redis Architecture - Архитектура интеграции

## Общая архитектура системы

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRODUCTION STACK                          │
│                      (Railway Deployment)                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│  Chrome Browser  │         │  Frontend Next.js│
│                  │         │  (React/TS)      │
│  ┌────────────┐  │         │                  │
│  │ Extension  │  │─────────│  Dashboard UI    │
│  │  (MV3)     │  │  HTTPS  │  Admin Panel     │
│  └────────────┘  │         │                  │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         │ API Calls                  │ API Calls
         │ (Batch Validate,           │ (REST API)
         │  Deduct Credit,            │
         │  Finalize)                 │
         │                            │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Backend FastAPI       │
         │  Python 3.11+          │
         │                        │
         │  ┌──────────────────┐  │
         │  │ API Endpoints    │  │
         │  │ - Auth           │  │
         │  │ - Extensions     │  │
         │  │ - Billing        │  │
         │  └──────────────────┘  │
         │                        │
         │  ┌──────────────────┐  │
         │  │ Services Layer   │  │
         │  │ - ExtensionSvc   │  │
         │  │ - UserService    │  │
         │  │ - BillingService │  │
         │  └──────────────────┘  │
         └────────┬───────────────┘
                  │
         ┌────────┴──────────┐
         │                   │
         ▼                   ▼
┌─────────────────┐   ┌─────────────────┐
│  PostgreSQL DB  │   │  Redis Cache    │
│  (Railway)      │   │  (Railway/      │
│                 │   │   Upstash)      │
│  ┌───────────┐  │   │                 │
│  │ Tables:   │  │   │  ┌───────────┐  │
│  │ - users   │  │   │  │ Keys:     │  │
│  │ - licenses│  │   │  │ - session │  │
│  │ - payments│  │   │  │ - rate_lim│  │
│  │ - usage   │  │   │  │ - bindings│  │
│  └───────────┘  │   │  └───────────┘  │
└─────────────────┘   └─────────────────┘
```

## Redis Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     EXTENSION WORKFLOW                           │
└─────────────────────────────────────────────────────────────────┘

1️⃣ BATCH VALIDATION (Session Creation)
   ┌──────────┐
   │Extension │
   │ Browser  │
   └────┬─────┘
        │ POST /batch-validate
        │ {license_key, prompts_count}
        ▼
   ┌────────────┐      ┌──────────────┐
   │  Backend   │─────▶│ PostgreSQL   │ Check license validity
   │  FastAPI   │◀─────│              │ Check credits balance
   └─────┬──────┘      └──────────────┘
         │
         │ Generate session_token
         │ Reserve credits
         │
         ▼
   ┌──────────────┐
   │  Redis       │ Store session data:
   │              │ - session_token → {license, credits, config}
   │  SETEX       │ - rate_limit → 1 (TTL: 60s)
   │  TTL: 1 hour │ 
   └──────────────┘
         │
         ▼
   ┌──────────┐
   │Extension │ Response: {session_token, config}
   │ Browser  │
   └──────────┘

2️⃣ PROMPT SENDING (Credit Deduction)
   ┌──────────┐
   │Extension │ For each prompt:
   │ Discord  │
   └────┬─────┘
        │ POST /deduct-credit
        │ {session_token, prompt_index}
        ▼
   ┌────────────┐      ┌──────────────┐
   │  Backend   │─────▶│  Redis       │ GET session data
   │  FastAPI   │◀─────│              │
   └─────┬──────┘      └──────────────┘
         │
         │ Verify session valid
         │ Check not already deducted
         │
         ▼
   ┌──────────────┐
   │ PostgreSQL   │ Deduct 1 credit from user
   │              │ Log usage
   └──────────────┘
         │
         ▼
   ┌──────────────┐
   │  Redis       │ Update session:
   │              │ - deducted_prompts += 1
   │  SETEX       │ - mark prompt_index as used
   │              │
   └──────────────┘
         │
         ▼
   ┌──────────┐
   │Extension │ Response: {success, credits_remaining}
   │ Discord  │
   └──────────┘

3️⃣ SESSION FINALIZATION
   ┌──────────┐
   │Extension │ After all prompts sent
   │ Browser  │
   └────┬─────┘
        │ POST /finalize-session
        │ {session_token, stats}
        ▼
   ┌────────────┐      ┌──────────────┐
   │  Backend   │─────▶│  Redis       │ GET session data
   │  FastAPI   │◀─────│              │
   └─────┬──────┘      └──────────────┘
         │
         │ Calculate final stats
         │ Release any unreserved credits
         │
         ▼
   ┌──────────────┐
   │ PostgreSQL   │ Update user stats
   │              │ Log session completion
   └──────────────┘
         │
         ▼
   ┌──────────────┐
   │  Redis       │ DEL session data
   │              │ (cleanup)
   └──────────────┘
         │
         ▼
   ┌──────────┐
   │Extension │ Response: {success, total_credits_used}
   │ Browser  │
   └──────────┘
```

## Redis Key Patterns

### 1. Session Storage
```python
Key:   ext_session:<session_token>
Value: {
  "license_key": "sk_live_...",
  "prompts_count": 10,
  "prompts_sent": 3,
  "deducted_prompts": [0, 1, 2],  # Индексы списанных промптов
  "created_at": 1703606400,
  "config": {
    "min_interval_ms": 60000,
    "max_retries": 3
  }
}
TTL:   3600 seconds (1 hour)
```

**Использование:**
- Хранение состояния сессии между запросами
- Проверка что кредит не списывается дважды
- Конфигурация для расширения

### 2. Rate Limiting
```python
Key:   ext_rate_limit:<license_key>:batch
Value: "1"  # Счётчик запросов
TTL:   60 seconds

Key:   ext_rate_limit:<license_key>:deduct
Value: "5"  # Счётчик запросов
TTL:   60 seconds
```

**Использование:**
- Защита от спама batch-validate (1 запрос/минуту)
- Защита от DDoS deduct-credit (10 запросов/минуту)
- Graceful degradation (если Redis недоступен, rate limit отключён)

### 3. Fingerprinting (Device Bindings)
```python
Key:   ext_bindings:<license_key>
Value: [
  {
    "fingerprint": "abc123...",
    "device_info": {
      "os": "Windows",
      "browser": "Chrome",
      "last_seen": 1703606400
    },
    "first_seen": 1703520000
  },
  ...
]
TTL:   604800 seconds (7 days)
```

**Использование:**
- Привязка лицензий к устройствам
- Лимит устройств (3 на лицензию)
- Антипиратство

### 4. Cache (опционально)
```python
Key:   ext_license_cache:<license_key>
Value: {
  "valid": true,
  "credits": 100,
  "expires_at": "2024-12-31"
}
TTL:   300 seconds (5 minutes)
```

**Использование:**
- Кэширование результатов проверки лицензий
- Снижение нагрузки на PostgreSQL
- Graceful degradation при проблемах с БД

## Redis Commands Used

### Read Operations
```python
# Получить session data
GET ext_session:<token>

# Проверить rate limit
EXISTS ext_rate_limit:<license>:batch

# Получить device bindings
GET ext_bindings:<license>
```

### Write Operations
```python
# Создать session с TTL
SETEX ext_session:<token> 3600 <json_data>

# Установить rate limit
SETEX ext_rate_limit:<license>:batch 60 "1"

# Обновить bindings
SETEX ext_bindings:<license> 604800 <json_data>

# Удалить session
DEL ext_session:<token>
```

### Maintenance
```python
# Проверка подключения
PING

# Количество ключей
DBSIZE

# Информация о памяти
INFO memory

# Список активных подключений
CLIENT LIST
```

## Performance Characteristics

### Latency (Railway us-east)
```
Backend → Redis:  < 5ms  (internal network)
Backend → PostgreSQL: 10-20ms

Rate limit check:  < 1ms  (Redis GET)
Session lookup:    < 2ms  (Redis GET + deserialize)
Session update:    < 3ms  (Redis SETEX + serialize)
```

### Memory Usage
```
1 session:        ~2 KB
1 rate limit:     ~100 bytes
1 binding set:    ~5 KB

Expected for 100 active users:
- 100 sessions:       ~200 KB
- 100 rate limits:    ~10 KB
- 100 binding sets:   ~500 KB
Total:                ~710 KB (~1 MB with overhead)
```

### Scalability
```
Free tier (Railway):     ~100 MB → ~100K sessions
Upstash free:            ~10K commands/day → ~500 sessions/day
Redis Cloud free:        30 MB → ~30K sessions
```

## Failover & Recovery

### Scenario 1: Redis Down (startup)
```python
try:
    await init_redis()
except Exception:
    print("⚠️ Redis connection failed")
    _redis_client = None  # Continue without Redis
```

**Impact:**
- ✅ API работает
- ❌ Rate limiting отключён
- ❌ Session storage недоступен (требуется PostgreSQL fallback)
- ❌ Кэш недоступен

### Scenario 2: Redis Timeout (operation)
```python
try:
    await redis.get(key)
except asyncio.TimeoutError:
    # Fallback to PostgreSQL or reject request
    pass
```

**Mitigation:**
- Connection pooling (50 connections)
- Retry on timeout (включён)
- Health check каждые 30 секунд
- Таймауты 5 секунд

### Scenario 3: Redis Memory Full
```
maxmemory-policy: allkeys-lru  # Удалять старые ключи
```

**Behavior:**
- Старые sessions удаляются автоматически
- Rate limits имеют приоритет (короткий TTL)
- Новые sessions могут быть созданы

## Security Considerations

### 1. Data Encryption
```
✅ TLS in transit (Railway internal network)
✅ Password authentication (если настроен)
❌ Data at rest encryption (зависит от провайдера)
```

### 2. Data Sensitivity
```
Session data:     Medium  (session tokens, но не passwords)
Rate limits:      Low     (только счётчики)
Bindings:         Medium  (fingerprints, но не PII)
```

### 3. Data Retention
```
Sessions:         1 hour   (auto-expire)
Rate limits:      1 minute (auto-expire)
Bindings:         7 days   (auto-expire)
```

## Monitoring & Alerts

### Key Metrics
```
1. Connection Pool:
   - Active connections < 45 (из 50)
   - Connection errors < 1/min

2. Memory:
   - Used memory < 80% of limit
   - Evicted keys = 0 (если memory не full)

3. Latency:
   - p50 < 5ms
   - p99 < 20ms
   - Timeouts < 0.1%

4. Commands:
   - GET: ~60% (read-heavy)
   - SETEX: ~30%
   - DEL: ~10%
```

### Recommended Alerts
```
⚠️ Warning:
- Memory > 70%
- Connection errors > 5/min
- Latency p99 > 50ms

🚨 Critical:
- Memory > 90%
- Connection errors > 20/min
- Redis down > 1 minute
```

## Backup & Recovery

### Session Data (ephemeral)
```
❌ Backup not needed
✅ Automatic TTL cleanup (1 hour)
✅ Extension creates new session if lost
```

### Rate Limits (ephemeral)
```
❌ Backup not needed
✅ Automatic reset on Redis restart (acceptable)
✅ Rate limits refresh every minute
```

### Bindings (important)
```
✅ Consider periodic backup to PostgreSQL
✅ 7 day TTL → enough time for manual recovery
✅ Or use Redis with AOF persistence
```

## Migration Path

### Phase 1: No Redis (current)
```
✅ API works
❌ No rate limiting
❌ No session storage
❌ No caching
```

### Phase 2: Redis Added (target)
```
✅ API works
✅ Rate limiting active
✅ Session storage in Redis
✅ Caching enabled
```

### Phase 3: Redis + PostgreSQL Fallback (future)
```
✅ API works even if Redis down
✅ Rate limiting in Redis (or PostgreSQL if down)
✅ Session storage in Redis (or PostgreSQL if down)
✅ Maximum reliability
```

## References

- 📖 [Railway Redis Docs](https://docs.railway.app/databases/redis)
- 📖 [Upstash Redis Docs](https://docs.upstash.com/redis)
- 📖 [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- 📖 [FastAPI + Redis](https://fastapi.tiangolo.com/advanced/async-sql-databases/)

---

**Дата:** 26 декабря 2025
**Версия:** 1.0
**Автор:** AI Assistant

