# 🔐 Security Integration Guide
## Интеграция системы защиты в расширение

**Дата:** December 22, 2025  
**Версия:** 1.0  

---

## 📋 ОБЗОР

Это руководство описывает интеграцию многоуровневой системы защиты в Chrome-расширение.

**Полная документация:** См. `../Docs/SECURITY_PROTECTION_GUIDE.md`

---

## 📦 ФАЙЛОВАЯ СТРУКТУРА

Система защиты состоит из следующих файлов:

```
extension/src/
├── utils/
│   ├── api-client.ts          # API клиент с batch validation
│   ├── automation.ts           # Логика автоматизации с защитой
│   ├── fingerprint.ts          # Device fingerprinting (optional)
│   └── storage.ts              # Chrome storage wrapper
├── types/
│   └── index.ts                # TypeScript types
└── popup.ts                    # UI с интеграцией защиты
```

---

## 🚀 БЫСТРЫЙ СТАРТ

### 1. Использование в Popup

```typescript
import { startAutomation } from './utils/automation';
import { apiClient } from './utils/api-client';

// Валидация лицензии при открытии popup
async function validateLicense(licenseKey: string) {
  try {
    // Простая валидация (legacy endpoint)
    const response = await fetch('https://api.yourdomain.com/api/v1/extensions/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: licenseKey })
    });
    
    const data = await response.json();
    
    if (data.valid) {
      // Показать UI с балансом
      showUI(data.balance, data.tier);
    } else {
      showError(data.message);
    }
  } catch (error) {
    showError('Failed to validate license');
  }
}

// Запуск автоматизации с защитой
async function onStartClick() {
  const licenseKey = await getLicenseKey();
  const prompts = getPromptsFromUI();
  
  // Batch validation + отправка промптов
  const result = await startAutomation(
    prompts,
    licenseKey,
    (current, total, status) => {
      // Update progress bar
      updateProgressUI(current, total, status);
    }
  );
  
  if (result.success) {
    showSuccess(result.message);
  } else {
    showError(result.message);
  }
}
```

### 2. Получение баланса

```typescript
import { apiClient } from './utils/api-client';

async function updateBalance() {
  const licenseKey = await getLicenseKey();
  
  try {
    const balance = await apiClient.getBalance(licenseKey);
    
    // Обновить UI
    document.getElementById('balance').textContent = balance.balance.toString();
    document.getElementById('tier').textContent = balance.monthly_limit 
      ? `${balance.used_this_month}/${balance.monthly_limit}` 
      : 'Unlimited';
      
  } catch (error) {
    console.error('Failed to get balance:', error);
  }
}

// Обновлять баланс каждые 30 секунд
setInterval(updateBalance, 30000);
```

### 3. Graceful Degradation

```typescript
import { apiClient } from './utils/api-client';

// Проверить доступность API перед началом
async function checkAPIStatus() {
  const isAvailable = await apiClient.healthCheck();
  
  if (!isAvailable) {
    showWarning('API unavailable. Working in offline mode with cached permissions.');
  }
}

// Вызвать при открытии popup
await checkAPIStatus();
```

### 4. Fingerprinting (Optional)

```typescript
import { generateFingerprint, getDeviceInfo } from './utils/fingerprint';
import { apiClient } from './utils/api-client';

// Привязать лицензию при первой активации
async function bindLicenseOnFirstRun(licenseKey: string) {
  const isFirstRun = !(await chrome.storage.local.get('license_bound')).license_bound;
  
  if (isFirstRun) {
    const fingerprint = await generateFingerprint();
    const deviceInfo = getDeviceInfo();
    
    const result = await apiClient.bindLicense(licenseKey, fingerprint, deviceInfo);
    
    if (result.status === 'bound') {
      await chrome.storage.local.set({ license_bound: true });
      console.log('✅ License bound to device');
    } else if (result.status === 'approval_required') {
      showWarning('License already used on 3 devices. Check your email to approve.');
    }
  }
}
```

---

## 🔧 КОНФИГУРАЦИЯ

### API Base URL

По умолчанию используется production URL. Для разработки измените в `api-client.ts`:

```typescript
const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:8000/api/v1'
  : 'https://api.yourdomain.com/api/v1';
```

### Cache TTL

Время жизни кэша для graceful degradation (по умолчанию 5 минут):

```typescript
// api-client.ts
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
```

---

## 📊 FLOW DIAGRAM

```
┌──────────────────────────────────────────────────┐
│ 1. User Opens Popup                              │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│ 2. Validate License Key (simple check)           │
│    POST /extensions/validate-key                 │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│ 3. Show UI with Balance                          │
│    User enters prompts                           │
│    User clicks "Start"                           │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│ 4. Batch Validation (ONE API call)               │
│    POST /extensions/batch-validate               │
│    - Validate license                            │
│    - Reserve credits                             │
│    - Get session token                           │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│ 5. Send Prompts to Discord (NO API calls)        │
│    - Use interval from server config             │
│    - Handle errors (max retries)                 │
│    - Update progress UI                          │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│ 6. Finalize Session (ONE API call)               │
│    POST /extensions/finalize-session             │
│    - Confirm credits used                        │
│    - Return unused credits                       │
└──────────────────────────────────────────────────┘
```

**Итого:** 2 API запроса вместо 100+

---

## ⚠️ ВАЖНЫЕ ЗАМЕТКИ

### 1. НЕ Хардкодить Интервалы

❌ **ПЛОХО:**
```typescript
const INTERVAL_MS = 60000; // Хардкод
```

✅ **ХОРОШО:**
```typescript
// Получать с сервера через batch-validate
const session = await apiClient.batchValidate(licenseKey, prompts.length);
const interval = session.config.min_interval_ms;
```

### 2. Всегда Финализировать Сессию

Даже при ошибках, вызывайте `finalizeSession()`:

```typescript
try {
  await startAutomation(prompts, licenseKey);
} catch (error) {
  // Всё равно финализировать
  await apiClient.finalizeSession(sessionToken, sentCount);
}
```

### 3. Кэшировать Разрешения

Для graceful degradation, `api-client.ts` автоматически кэширует успешные разрешения.

### 4. Обработка Ошибок

```typescript
try {
  const result = await startAutomation(prompts, licenseKey);
  
  if (!result.success) {
    // Показать пользователю
    showError(result.message);
  }
} catch (error) {
  // Критическая ошибка
  showError('Fatal error: ' + error.message);
}
```

---

## 🧪 ТЕСТИРОВАНИЕ

### Manual Testing Checklist

- [ ] Валидация лицензии работает
- [ ] Batch validation резервирует кредиты
- [ ] Промпты отправляются с правильным интервалом
- [ ] Финализация возвращает неиспользованные кредиты
- [ ] Graceful degradation работает при offline API
- [ ] Баланс обновляется корректно
- [ ] Ошибки отображаются пользователю
- [ ] Fingerprinting работает (если включен)

### Тестирование Offline Mode

1. Запустить автоматизацию
2. Отключить интернет в процессе
3. Проверить, что расширение использует кэш
4. Проверить, что показывается предупреждение

---

## 📚 ДОПОЛНИТЕЛЬНЫЕ РЕСУРСЫ

- **Полная документация:** `../Docs/SECURITY_PROTECTION_GUIDE.md`
- **Backend API:** `../Docs/API_SPECIFICATION.md`
- **Implementation Guide:** `../Docs/IMPLEMENTATION_GUIDE.md`

---

**Создано:** December 22, 2025  
**Версия:** 1.0  

