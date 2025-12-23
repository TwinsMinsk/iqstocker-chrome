/**
 * API методы для billing и подписок
 */
import api from './client';

export interface Plan {
  id: string;
  name: string;
  price_eur: number;
  credits: number;
  price_per_credit?: number;
  duration_days?: number;
  discount_percent?: number;
  description: string;
}

export interface PurchasePlanRequest {
  plan_id: string;
}

export interface PurchasePlanResponse {
  payment_id: string;
  payment_url: string;
  plan: string;
  amount: number;
  currency: string;
  expires_at: string;
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  credits: number;
  status: string;
  plan?: string;
  created_at: string;
  completed_at?: string;
}

export interface TransactionsListResponse {
  total: number;
  transactions: Transaction[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  credits_balance: number;
  monthly_limit?: number;
  used_this_month: number;
  subscription_starts_at?: string;
  subscription_expires_at?: string;
}

export const billingAPI = {
  /**
   * Получить список планов
   */
  async getPlans(): Promise<Plan[]> {
    const response = await api.get<Plan[]>('/subscriptions/plans');
    return response.data;
  },

  /**
   * Купить план
   */
  async purchasePlan(data: PurchasePlanRequest): Promise<PurchasePlanResponse> {
    const response = await api.post<PurchasePlanResponse>('/subscriptions/purchase-plan', data);
    return response.data;
  },

  /**
   * Получить текущую подписку
   */
  async getMySubscription(): Promise<Subscription> {
    const response = await api.get<Subscription>('/subscriptions/me');
    return response.data;
  },

  /**
   * Получить историю транзакций
   */
  async getTransactions(limit = 20, offset = 0): Promise<TransactionsListResponse> {
    const response = await api.get<TransactionsListResponse>('/subscriptions/transactions', {
      params: { limit, offset },
    });
    return response.data;
  },
};

