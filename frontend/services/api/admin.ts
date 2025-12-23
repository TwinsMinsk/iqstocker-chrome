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
};

