/**
 * API Client для работы с backend
 */
import axios, { AxiosInstance, AxiosError } from 'axios';

// Получаем API URL из переменных окружения
// В Next.js NEXT_PUBLIC_* переменные встраиваются на этапе сборки
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? '' // В продакшене не используем localhost как фолбек
    : 'http://localhost:8000/api/v1');

// Проверка критических ошибок конфигурации
if (typeof window !== 'undefined') {
  if (!API_BASE_URL && process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: NEXT_PUBLIC_API_URL is not defined! API calls will fail.');
  }
}

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    // Request interceptor - добавляем токен
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - обработка ошибок
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Токен истек или невалиден
          this.clearToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', token);
  }

  setRefreshToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('refresh_token', token);
  }

  get instance(): AxiosInstance {
    return this.client;
  }
}

export const apiClient = new APIClient();
export default apiClient.instance;

