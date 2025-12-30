/**
 * API методы для аутентификации
 */
import api from './client';

export interface RegisterRequest {
  email: string;
  password: string;
  referral_code?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserResponse {
  id: string;
  email: string;
  email_verified: boolean;
  is_admin: boolean;
  created_at: string;
}

export const authAPI = {
  /**
   * Регистрация нового пользователя
   */
  async register(data: RegisterRequest): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>('/auth/register', data);
    return response.data;
  },

  /**
   * Вход пользователя
   */
  async login(data: LoginRequest): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>('/auth/login', data);
    return response.data;
  },

  /**
   * Обновление токена
   */
  async refresh(refreshToken: string): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  /**
   * Выход
   */
  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  /**
   * Получить текущего пользователя
   */
  async getMe(): Promise<UserResponse> {
    const response = await api.get<UserResponse>('/auth/me');
    return response.data;
  },

  /**
   * Верификация email
   */
  async verifyEmail(token: string): Promise<UserResponse> {
    const response = await api.post<UserResponse>('/auth/verify-email', { token });
    return response.data;
  },

  /**
   * OAuth Google
   */
  async googleOAuth(code: string, redirectUri: string): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>('/auth/google', {
      code,
      redirect_uri: redirectUri,
    });
    return response.data;
  },
};

