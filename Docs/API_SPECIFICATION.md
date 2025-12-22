# 🔌 API SPECIFICATION
## REST API для Midjourney Auto

**Base URL:** `https://api.yourdomain.com/api/v1`  
**Version:** 1.0.0  
**Authentication:** JWT Bearer Token  
**Rate Limit:** 100 req/min per IP  

---

## 📋 AUTH ENDPOINTS

### POST /auth/register
Register new user with email & password

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (201):**
```json
{
  "id": "usr_550e8400e29b41d4a716446655440000",
  "email": "user@example.com",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 2592000,
  "subscription": {
    "tier": "free",
    "balance": 50,
    "expires_at": null
  }
}
```

**Errors:**
- `400` - email_already_exists
- `422` - Validation error (weak password, invalid email)

---

### POST /auth/login
Login with email & password

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 2592000
}
```

**Errors:**
- `401` - invalid_credentials

---

### POST /auth/google
Login/Register with Google OAuth

**Request:**
```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ..."
}
```

**Response (200/201):**
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "bearer",
  "expires_in": 2592000,
  "is_new_user": true
}
```

---

### POST /auth/refresh
Refresh access token

**Headers:** (no auth needed)

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "access_token": "...",
  "token_type": "bearer",
  "expires_in": 2592000
}
```

---

### POST /auth/logout
Logout current user

**Headers:** `Authorization: Bearer {token}`

**Request:** (empty body)

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### POST /auth/forgot-password
Request password reset email

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Reset link sent to email"
}
```

---

### POST /auth/reset-password
Reset password with token from email

**Request:**
```json
{
  "token": "reset_token_from_email",
  "new_password": "NewPassword456!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

## 👤 USER ENDPOINTS

### GET /users/me
Get current user profile (requires auth)

**Headers:** `Authorization: Bearer {token}`

**Response (200):**
```json
{
  "id": "usr_550e8400e29b41d4a716446655440000",
  "email": "user@example.com",
  "is_admin": false,
  "email_verified": true,
  "created_at": "2025-12-21T14:30:00Z",
  "balance": {
    "credits": 4500,
    "eur_equivalent": 13.50
  },
  "subscription": {
    "tier": "standard",
    "expires_at": "2026-01-15T00:00:00Z",
    "monthly_limit": 5000,
    "used_this_month": 755,
    "renewal_date": "2026-01-15"
  },
  "license_key": {
    "id": "key_1234567890abcdef",
    "display": "sk_live_a1b2c3d4e5f6...",
    "created_at": "2025-12-21T14:35:00Z",
    "last_used": "2025-12-21T16:45:00Z",
    "active": true
  }
}
```

---

### PATCH /users/me
Update user profile

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "email": "newemail@example.com"
}
```

**Response (200):**
```json
{
  "id": "usr_550e8400e29b41d4a716446655440000",
  "email": "newemail@example.com",
  "updated_at": "2025-12-21T16:50:00Z"
}
```

---

### PATCH /users/me/password
Change password

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "old_password": "OldPassword123!",
  "new_password": "NewPassword456!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 🔐 LICENSE KEY ENDPOINTS

### POST /users/me/license-keys
Generate new license key

**Headers:** `Authorization: Bearer {token}`

**Request:** (empty body)

**Response (201):**
```json
{
  "id": "key_new1234567890",
  "display": "sk_live_newkey123...",
  "created_at": "2025-12-21T17:00:00Z",
  "active": true
}
```

---

### DELETE /users/me/license-keys/{key_id}
Revoke license key

**Headers:** `Authorization: Bearer {token}`

**Response (200):**
```json
{
  "success": true,
  "message": "License key revoked"
}
```

---

## 📱 EXTENSION ENDPOINTS

### POST /extensions/validate-key
Validate license key (extension side)

**Headers:** (no auth needed)

**Request:**
```json
{
  "key": "sk_live_a1b2c3d4e5f6..."
}
```

**Response (200):**
```json
{
  "valid": true,
  "user_id": "usr_550e8400e29b41d4a716446655440000",
  "subscription_active": true,
  "tier": "standard",
  "expires_at": "2026-01-15T00:00:00Z",
  "balance": 4500,
  "monthly_limit": 5000,
  "used_this_month": 755
}
```

**Response (401):**
```json
{
  "valid": false,
  "error": "invalid_or_expired_key",
  "message": "License key неверный или истекший"
}
```

---

### GET /extensions/balance
Get current balance (extension side)

**Headers:** `Authorization: Bearer {token}`

**Response (200):**
```json
{
  "balance": 4500,
  "subscription_expires": "2026-01-15T00:00:00Z",
  "monthly_limit": 5000,
  "used_this_month": 755,
  "last_sync": "2025-12-21T16:55:00Z"
}
```

---

### POST /extensions/log-usage
Log extension session (metadata only, NO prompts text)

**Headers:** `Authorization: Bearer {token}` (optional, можно по key)

**Request:**
```json
{
  "session_id": "sess_a1b2c3d4e5f6",
  "prompts_count": 25,
  "errors_count": 2,
  "duration_seconds": 1250,
  "events": [
    {
      "status": "success",
      "timestamp": "2025-12-21T15:35:00Z",
      "duration_ms": 2500
    },
    {
      "status": "error",
      "error_type": "rate_limit_exceeded",
      "timestamp": "2025-12-21T15:36:00Z"
    }
  ]
}
```

**Response (201):**
```json
{
  "session_id": "sess_a1b2c3d4e5f6",
  "recorded": true,
  "message": "Session logged successfully"
}
```

---

## 💳 BILLING ENDPOINTS

### GET /subscriptions/plans
List available plans

**Headers:** (no auth needed)

**Response (200):**
```json
[
  {
    "id": "plan_free",
    "name": "FREE",
    "price_eur": 0.00,
    "credits": 50,
    "duration_days": null,
    "description": "Бесплатный тестовый тариф"
  },
  {
    "id": "plan_basic",
    "name": "BASIC",
    "price_eur": 3.00,
    "credits": 1000,
    "price_per_credit": 0.003,
    "duration_days": 30,
    "description": "Подходит для начинающих"
  },
  {
    "id": "plan_standard",
    "name": "STANDARD",
    "price_eur": 10.00,
    "credits": 5000,
    "price_per_credit": 0.002,
    "duration_days": 30,
    "discount_percent": 33,
    "description": "Самый популярный тариф"
  },
  {
    "id": "plan_pro",
    "name": "PRO",
    "price_eur": 17.00,
    "credits": 10000,
    "price_per_credit": 0.0017,
    "duration_days": 30,
    "discount_percent": 50,
    "description": "Для профессионалов"
  }
]
```

---

### POST /subscriptions/purchase-plan
Start payment for subscription plan

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "plan_id": "plan_standard"
}
```

**Response (200):**
```json
{
  "payment_id": "pay_550e8400e29b41d4a716446655440000",
  "payment_url": "https://tribute.to/yourdomain/pay_550e...",
  "plan": "STANDARD",
  "amount": 10.00,
  "currency": "EUR",
  "expires_at": "2025-12-21T18:50:00Z"
}
```

---

### GET /transactions
Get user payment history

**Headers:** `Authorization: Bearer {token}`

**Query Params:**
- `limit` (default: 20)
- `offset` (default: 0)

**Response (200):**
```json
{
  "total": 5,
  "transactions": [
    {
      "id": "txn_1234567890",
      "type": "purchase",
      "amount": 10.00,
      "currency": "EUR",
      "credits": 5000,
      "status": "completed",
      "plan": "STANDARD",
      "created_at": "2025-12-21T16:50:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 5
  }
}
```

---

## 📊 ANALYTICS ENDPOINTS

### GET /analytics/usage
Get usage statistics

**Headers:** `Authorization: Bearer {token}`

**Query Params:**
- `period` (default: "30d") - "7d", "30d", "90d", "all"
- `group_by` (default: "day") - "day", "week", "month"

**Response (200):**
```json
{
  "period": "30d",
  "total_prompts": 2530,
  "successful_prompts": 2480,
  "failed_prompts": 50,
  "success_rate": 98.0,
  "daily_data": [
    {
      "date": "2025-12-21",
      "prompts_count": 85,
      "success_count": 83,
      "error_count": 2,
      "credits_used": 255
    }
  ]
}
```

---

## 👨‍💼 ADMIN ENDPOINTS (requires is_admin=true)

### GET /admin/users
List all users with pagination

**Headers:** `Authorization: Bearer {admin_token}`

**Query Params:**
- `page` (default: 1)
- `limit` (default: 50)
- `search` (email search)
- `sort` (created_at, balance)

**Response (200):**
```json
{
  "total": 156,
  "users": [
    {
      "id": "usr_550e8400e29b41d4a716446655440000",
      "email": "user@example.com",
      "balance": 4500,
      "subscription_tier": "standard",
      "created_at": "2025-12-21T14:30:00Z",
      "last_active": "2025-12-21T16:55:00Z",
      "is_blocked": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total_pages": 4
  }
}
```

---

### PATCH /admin/users/{user_id}
Edit user (admin only)

**Headers:** `Authorization: Bearer {admin_token}`

**Request:**
```json
{
  "balance": 5000,
  "is_blocked": false
}
```

**Response (200):**
```json
{
  "id": "usr_550e8400e29b41d4a716446655440000",
  "email": "user@example.com",
  "balance": 5000,
  "is_blocked": false,
  "updated_at": "2025-12-21T16:55:00Z"
}
```

---

### GET /admin/logs
View extension logs (admin only)

**Headers:** `Authorization: Bearer {admin_token}`

**Query Params:**
- `user_id` (filter by user)
- `status` (success, error, paused)
- `error_type` (rate_limit, invalid_prompt, network_error)
- `limit` (default: 100)

**Response (200):**
```json
{
  "total": 523,
  "logs": [
    {
      "id": "log_abc123",
      "user_id": "usr_550e...",
      "user_email": "user@example.com",
      "session_id": "sess_xyz789",
      "status": "error",
      "error_type": "rate_limit_exceeded",
      "error_message": "429 Too Many Requests",
      "prompts_count": 12,
      "duration_seconds": 600,
      "timestamp": "2025-12-21T15:35:00Z"
    }
  ]
}
```

---

## 🔔 WEBHOOK ENDPOINTS

### POST /payments/webhook/tribute
Telegram Tribute payment webhook

**Документация:** https://wiki.tribute.tg/for-content-creators/api-documentation/webhooks

**Headers:**
- `trbt-signature` (HMAC-SHA256 подпись request body, подписанная API ключом)

**Request (new_subscription):**
```json
{
  "name": "new_subscription",
  "created_at": "2025-08-25T01:15:58.33246Z",
  "sent_at": "2025-08-25T01:15:58.542279448Z",
  "payload": {
    "subscription_name": "STANDARD Plan",
    "subscription_id": 1644,
    "period_id": 1547,
    "period": "monthly",
    "price": 1000,
    "amount": 1000,
    "currency": "eur",
    "user_id": 31326,
    "telegram_user_id": 12321321,
    "channel_id": 614,
    "channel_name": "midjourney_auto",
    "expires_at": "2025-04-20T01:15:57.305733Z"
  }
}
```

**Request (cancelled_subscription):**
```json
{
  "name": "cancelled_subscription",
  "created_at": "2025-03-21T11:20:44.013969Z",
  "sent_at": "2025-03-21T11:20:44.527657077Z",
  "payload": {
    "subscription_name": "STANDARD Plan",
    "subscription_id": 1646,
    "period_id": 1549,
    "period": "monthly",
    "price": 1000,
    "amount": 1000,
    "currency": "eur",
    "user_id": 31326,
    "telegram_user_id": 12321321,
    "channel_id": 614,
    "channel_name": "midjourney_auto",
    "cancel_reason": "",
    "expires_at": "2025-03-20T11:13:44.737Z"
  }
}
```

**Response (200):**
```json
{
  "status": "ok"
}
```

**Response (200 - Already Processed):**
```json
{
  "status": "already_processed"
}
```

**Errors:**
- `400` - Invalid webhook data
- `401` - Invalid webhook signature

**Signature Verification:**
```python
import hmac
import hashlib

def verify_tribute_signature(request_body: bytes, signature: str, api_key: str) -> bool:
    computed = hmac.new(
        api_key.encode(),
        request_body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(computed, signature)
```

**Retry Logic:** Tribute повторяет отправку при ошибке через: 5min, 15min, 30min, 1h, 10h

**Idempotency:** Проверяйте `period_id` на дублирование транзакций

---

## 📥 DOWNLOAD ENDPOINTS

### GET /extensions/download/zip
Download extension as ZIP file

**Headers:** `Authorization: Bearer {token}`

**Response:** Binary ZIP file

---

### GET /extensions/download/exe
Download compiled extension as EXE

**Headers:** `Authorization: Bearer {token}`

**Response:** Binary EXE file

---

## ❌ ERROR RESPONSES

### Standard Error Format
```json
{
  "error": "error_code",
  "message": "Human readable message",
  "status_code": 400,
  "timestamp": "2025-12-21T16:50:00Z"
}
```

### Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `invalid_request` | 400 | Malformed request |
| `validation_error` | 422 | Input validation failed |
| `unauthorized` | 401 | Missing/invalid token |
| `forbidden` | 403 | Insufficient permissions |
| `not_found` | 404 | Resource not found |
| `email_already_exists` | 400 | Email registered |
| `invalid_credentials` | 401 | Wrong password/email |
| `invalid_or_expired_key` | 401 | License key invalid |
| `rate_limit_exceeded` | 429 | Too many requests |
| `internal_error` | 500 | Server error |

---

**Last Updated:** December 22, 2025