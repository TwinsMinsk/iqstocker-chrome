/**
 * API методы для работы с пользователями
 */
import api from './client';

export interface LicenseKeyInfo {
  id: string;
  display: string;
  created_at: string;
  last_used: string | null;
  active: boolean;
}

export interface BalanceInfo {
  credits: number;
  eur_equivalent: string;
}

export interface SubscriptionInfo {
  tier: string;
  expires_at: string | null;
  monthly_limit: number | null;
  used_this_month: number;
  renewal_date: string | null;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  is_admin: boolean;
  is_superuser?: boolean;  // Алиас для is_admin для совместимости
  email_verified: boolean;
  created_at: string;
  balance: BalanceInfo;
  subscription: SubscriptionInfo;
  license_key: LicenseKeyInfo;
}

export interface LicenseKeyResponse {
  id: string;
  display: string;
  created_at: string;
  active: boolean;
}

export interface ReferralStatsResponse {
  referral_code: string | null;
  invited_count: number;
  total_earned_credits: number;
}

export const usersAPI = {
  /**
   * Получить полный профиль пользователя (включая license_key)
   */
  async getProfile(): Promise<UserProfileResponse> {
    const response = await api.get<UserProfileResponse>('/users/me');
    return response.data;
  },

  /**
   * Сгенерировать новый лицензионный ключ
   */
  async generateLicenseKey(): Promise<LicenseKeyResponse> {
    const response = await api.post<LicenseKeyResponse>('/users/me/license-keys');
    return response.data;
  },

  /**
   * Отозвать лицензионный ключ
   */
  async revokeLicenseKey(keyId: string): Promise<void> {
    await api.delete(`/users/me/license-keys/${keyId}`);
  },

  /**
   * Получить статистику рефералов
   */
  async getReferralStats(): Promise<ReferralStatsResponse> {
    const response = await api.get<ReferralStatsResponse>('/users/me/referral');
    return response.data;
  },
};

