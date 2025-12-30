/**
 * API Client для работы с backend
 */
import axios, { AxiosInstance, AxiosError } from 'axios';

function normalizeApiBaseUrl(raw?: string): string {
  // В Next.js NEXT_PUBLIC_* переменные встраиваются на этапе сборки
  const val = (raw ?? '').trim().replace(/\/+$/, '');

  // Dev fallback (локальная разработка)
  if (!val) {
    return process.env.NODE_ENV === 'production'
      ? '' // в production не гадаем адрес бэка
      : 'http://localhost:8000/api/v1';
  }

  // Relative baseURL (например "/api/v1" через reverse-proxy)
  if (val.startsWith('/')) {
    if (val === '/api/v1' || val.startsWith('/api/v1/')) return val.replace(/\/+$/, '');
    if (val === '/api' || val.startsWith('/api/')) return `${val.replace(/\/+$/, '')}/v1`;
    // Если это просто "/backend" — оставляем как есть (пользователь явно так настроил).
    return val;
  }

  // Absolute URL
  try {
    const url = new URL(val);
    const path = url.pathname.replace(/\/+$/, '');
    if (path === '/api/v1' || path.startsWith('/api/v1/')) return url.toString().replace(/\/+$/, '');
    if (path === '/api' || path.startsWith('/api/')) {
      url.pathname = `${path}/v1`;
      return url.toString().replace(/\/+$/, '');
    }
    // Самый частый кейс на Railway: дают "https://backend-xxx.up.railway.app"
    // В таком случае API живёт на "/api/v1".
    url.pathname = `${path === '/' ? '' : path}/api/v1`;
    return url.toString().replace(/\/+$/, '');
  } catch {
    // Если передали невалидную строку — используем как есть.
    return val;
  }
}

const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

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

