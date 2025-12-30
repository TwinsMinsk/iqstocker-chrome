/**
 * API методы для админ-панели
 */
import api from './client';

export interface AdminUser {
  id: string;
  email: string;
  balance: number;
  subscription_tier: string;
  created_at: string;
  last_active: string | null;
  is_blocked: boolean;
  is_admin: boolean;
  email_verified: boolean;
}

export interface AdminUserListResponse {
  total: number;
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface AdminUserUpdateRequest {
  balance?: number;
  is_blocked?: boolean;
  is_admin?: boolean;
}

export interface AdminUserUpdateResponse {
  id: string;
  email: string;
  balance: number;
  is_blocked: boolean;
  is_admin: boolean;
  updated_at: string;
}

export interface AdminLog {
  id: string;
  user_id: string;
  user_email: string;
  session_id: string;
  status: 'success' | 'error' | 'paused' | 'completed';
  error_type: string | null;
  error_message: string | null;
  prompts_count: number;
  successful_count: number;
  failed_count: number;
  duration_seconds: number | null;
  timestamp: string;
}

export interface AdminLogListResponse {
  total: number;
  logs: AdminLog[];
}

// === PROMO CODES ===

export interface PromoCode {
  code: string;
  credit_amount: number;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
}

export interface CreatePromoRequest {
  code: string;
  credit_amount: number;
  max_uses?: number;
  expires_at?: string;
  description?: string;
}

// === REFERRAL CONFIG ===

export interface ReferralConfig {
  tariff_plan_id: string;
  plan_name: string;
  reward_credits: number;
  is_active: boolean;
}

export interface UpdateReferralConfigRequest {
  reward_credits: number;
  is_active: boolean;
}

// === ANALYTICS ===

export interface DashboardStats {
  // Период
  period_start: string;
  period_end: string;
  
  // 1. Приток пользователей
  total_users: number;  // Общее количество за все время
  new_users_month: number;  // Новые пользователи за месяц
  growth_rate: number;  // Темп роста (% к прошлому месяцу)
  
  // 2. Активные пользователи
  dau_count: number;  // DAU (количество)
  dau_percentage: number;  // DAU (% от общего числа)
  wau_count: number;  // WAU (количество)
  wau_percentage: number;  // WAU (% от общего числа)
  mau_count: number;  // MAU (количество)
  mau_percentage: number;  // MAU (% от общего числа)
  
  // 3. Платящие пользователи
  paying_users_month: number;  // Количество платящих за месяц (уникальные)
  paying_users_percentage: number;  // % платящих от общего количества
  
  // 4. Доход и средний чек
  total_revenue_eur: number;  // Общая выручка за месяц
  average_check: number;  // AOV (Average Order Value) за месяц
  ltv: number;  // LTV (Lifetime Value) средний по платящим
  retention_rate: number;  // Retention платящих (30 дней)
  
  // Дополнительные метрики
  total_generations: number;
  new_referrals: number;
}

// === BILLING ===

export interface BillingPlanConfig {
  plan_id: string;
  plan_name: string;
  credits: number;
  payment_link: string | null;
}

export interface BillingConfigResponse {
  tribute_webhook_secret_set: boolean;
  plans: BillingPlanConfig[];
}

export interface BillingConfigUpdateRequest {
  payment_links: Record<string, string>;
  tribute_webhook_secret?: string;
}

export interface AdminTransactionItem {
  id: string;
  user_id: string;
  payment_id: string | null;
  plan_id: string | null;
  amount: number;
  credits: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export interface AdminTransactionListResponse {
  total: number;
  transactions: AdminTransactionItem[];
}

export interface WebhookVerifyRequest {
  raw_body: string;
  signature: string;
}

export interface WebhookVerifyResponse {
  valid: boolean;
  secret_source: 'env' | 'db' | 'missing';
  parsed_event_name: string | null;
}

export interface WebhookSelftestResponse {
  raw_body: string;
  signature: string;
  valid: boolean;
  secret_source: 'env' | 'db' | 'missing';
}

export interface AdminWebhookEventItem {
  id: string;
  received_at: string;
  processed_at: string | null;
  name: string | null;
  period_id: string | null;
  telegram_user_id: string | null;
  tribute_user_id: string | null;
  status: string;
  http_status: number | null;
  error_message: string | null;
  raw_body_sha256: string;
}

export interface AdminWebhookEventListResponse {
  total: number;
  events: AdminWebhookEventItem[];
}

export const adminAPI = {
  /**
   * Получить список всех пользователей
   */
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: 'created_at' | 'balance';
  }): Promise<AdminUserListResponse> {
    const response = await api.get<AdminUserListResponse>('/admin/users', {
      params,
    });
    return response.data;
  },

  /**
   * Обновить данные пользователя
   */
  async updateUser(
    userId: string,
    data: AdminUserUpdateRequest
  ): Promise<AdminUserUpdateResponse> {
    const response = await api.patch<AdminUserUpdateResponse>(
      `/admin/users/${userId}`,
      data
    );
    return response.data;
  },

  /**
   * Получить список логов
   */
  async getLogs(params?: {
    user_id?: string;
    status?: string;
    error_type?: string;
    limit?: number;
  }): Promise<AdminLogListResponse> {
    const response = await api.get<AdminLogListResponse>('/admin/logs', {
      params,
    });
    return response.data;
  },

  // === PROMO CODES ===

  /**
   * Получить список промокодов
   */
  async getPromoCodes(includeInactive = false): Promise<PromoCode[]> {
    const response = await api.get<PromoCode[]>('/admin/promocodes', {
      params: { include_inactive: includeInactive },
    });
    return response.data;
  },

  /**
   * Создать промокод
   */
  async createPromoCode(data: CreatePromoRequest): Promise<PromoCode> {
    const response = await api.post<PromoCode>('/admin/promocodes', data);
    return response.data;
  },

  /**
   * Деактивировать промокод
   */
  async deactivatePromoCode(code: string): Promise<void> {
    await api.delete(`/admin/promocodes/${code}`);
  },

  // === REFERRAL CONFIG ===

  /**
   * Получить настройки реферальных наград
   */
  async getReferralConfigs(): Promise<ReferralConfig[]> {
    const response = await api.get<ReferralConfig[]>('/admin/referrals/config');
    return response.data;
  },

  /**
   * Обновить настройки реферальной награды
   */
  async updateReferralConfig(planId: string, data: UpdateReferralConfigRequest): Promise<ReferralConfig> {
    const response = await api.put<ReferralConfig>(`/admin/referrals/config/${planId}`, data);
    return response.data;
  },

  // === ANALYTICS ===

  /**
   * Получить статистику дашборда
   */
  async getDashboardStats(days = 30): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>('/admin/analytics/dashboard', {
      params: { days },
    });
    return response.data;
  },

  // Billing settings
  async getBillingConfig(): Promise<BillingConfigResponse> {
    const response = await api.get<BillingConfigResponse>('/admin/billing/config');
    return response.data;
  },

  async updateBillingConfig(data: BillingConfigUpdateRequest): Promise<BillingConfigResponse> {
    const response = await api.put<BillingConfigResponse>('/admin/billing/config', data);
    return response.data;
  },

  async getTransactions(limit = 50): Promise<AdminTransactionListResponse> {
    const response = await api.get<AdminTransactionListResponse>('/admin/billing/transactions', {
      params: { limit },
    });
    return response.data;
  },

  async webhookSelftest(): Promise<WebhookSelftestResponse> {
    const response = await api.post<WebhookSelftestResponse>('/admin/billing/webhook/selftest');
    return response.data;
  },

  async webhookVerify(data: WebhookVerifyRequest): Promise<WebhookVerifyResponse> {
    const response = await api.post<WebhookVerifyResponse>('/admin/billing/webhook/verify', data);
    return response.data;
  },

  async getWebhookEvents(limit = 50): Promise<AdminWebhookEventListResponse> {
    const response = await api.get<AdminWebhookEventListResponse>('/admin/billing/webhook/events', {
      params: { limit },
    });
    return response.data;
  },
};

