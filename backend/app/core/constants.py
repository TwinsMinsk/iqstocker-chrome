"""
Константы приложения
"""

# Subscription Plans
PLAN_FREE = "free"
PLAN_BASIC = "basic"
PLAN_STANDARD = "standard"
PLAN_PRO = "pro"

# Subscription Status
SUBSCRIPTION_ACTIVE = "active"
SUBSCRIPTION_EXPIRED = "expired"
SUBSCRIPTION_CANCELLED = "cancelled"

# Transaction Types
TRANSACTION_PURCHASE = "purchase"
TRANSACTION_REFUND = "refund"
TRANSACTION_USAGE = "usage"

# Transaction Status
TRANSACTION_PENDING = "pending"
TRANSACTION_COMPLETED = "completed"
TRANSACTION_FAILED = "failed"

# Extension Log Status
LOG_SUCCESS = "success"
LOG_ERROR = "error"
LOG_PAUSED = "paused"
LOG_COMPLETED = "completed"

# Error Types
ERROR_RATE_LIMIT = "rate_limit"
ERROR_INVALID_PROMPT = "invalid_prompt"
ERROR_NETWORK = "network_error"
ERROR_DISCORD = "discord_error"

# Credits per plan
PLAN_CREDITS = {
    PLAN_FREE: 50,
    PLAN_BASIC: 1000,
    PLAN_STANDARD: 5000,
    PLAN_PRO: 10000,
}

# Price per plan (EUR)
PLAN_PRICES = {
    PLAN_BASIC: 3.00,
    PLAN_STANDARD: 10.00,
    PLAN_PRO: 17.00,
}

# Price per credit (EUR)
PRICE_PER_CREDIT = 0.003

