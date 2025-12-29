/**
 * API Client для расширения с batch validation и graceful degradation
 * 
 * Документация: См. Docs/SECURITY_PROTECTION_GUIDE.md
 */

import { getDefaultApiUrl, CACHE_TTL_MS } from '../constants/config';

export interface ExtensionConfig {
  min_interval_ms: number;
  max_interval_ms: number;
  max_retries: number;
  discord_input_selector?: string;  // Remote selector с сервера (опционально)
}

export interface BatchValidateResponse {
  allowed: boolean;
  session_token?: string;
  expires_at?: string;
  config?: ExtensionConfig;
  credits_reserved?: number;
  credits_remaining?: number;
  min_version_required?: string;  // Минимальная версия расширения (опционально)
  error?: string;
  message?: string;
}

export interface DeductCreditResponse {
  success: boolean;
  message: string;
  credits_remaining: number;
  credits_deducted: number;
}

export interface FinalizeSessionResponse {
  success: boolean;
  message: string;
  credits_used: number;
  credits_remaining: number;
}

export interface CachedPermission extends BatchValidateResponse {
  cached_at: number;
  ttl_ms: number;
}

/**
 * Получить API URL из storage или использовать production по умолчанию
 * 
 * Приоритет:
 * 1. Пользовательская настройка из chrome.storage (если задана)
 * 2. Production URL из config.ts
 */
async function getApiBaseUrl(): Promise<string> {
  const result = await chrome.storage.local.get('api_base_url');
  const candidate: string | undefined = result.api_base_url;

  // ВАЖНО (security): в production нельзя позволять пользователю/атакующему
  // указывать свой backend — это упрощает форк/копирование расширения.
  // Для разработки override можно включать через build-time флаг.
  //
  // Флаг задаётся в esbuild define, см. extension/build/build.js
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allowCustomApiUrl = typeof (globalThis as any).__ALLOW_CUSTOM_API_URL__ === 'boolean'
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).__ALLOW_CUSTOM_API_URL__
    : false;

  // Если пользователь не задал кастомный URL, используем production
  if (!candidate || typeof candidate !== 'string') {
    return getDefaultApiUrl();
  }

  // В production игнорируем кастомный URL полностью
  if (!allowCustomApiUrl) {
    return getDefaultApiUrl();
  }

  // Валидация пользовательского URL:
  // - Не даём подложить "javascript:" и т.п.
  // - Требуем http/https
  // - Требуем, чтобы путь начинался с /api/v1
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      console.warn('Invalid protocol in custom API URL, using default');
      return getDefaultApiUrl();
    }
    if (!url.pathname.startsWith('/api/v1')) {
      console.warn('Invalid path in custom API URL, using default');
      return getDefaultApiUrl();
    }

    // Нормализуем: убираем trailing slash
    return candidate.replace(/\/+$/, '');
  } catch {
    console.warn('Failed to parse custom API URL, using default');
    return getDefaultApiUrl();
  }
}

/**
 * Extension API Client с защитой
 */
export class ExtensionAPIClient {
  
  /**
   * 🔥 Batch Validation - основной метод защиты
   * 
   * Запрашивает разрешение на всю сессию.
   * Один запрос вместо 100+.
   * 
   * @param licenseKey - Лицензионный ключ
   * @param promptsCount - Количество промптов в сессии
   * @returns Response с session token и конфигурацией
   */
  async batchValidate(
    licenseKey: string,
    promptsCount: number
  ): Promise<BatchValidateResponse> {
    try {
      const apiUrl = await getApiBaseUrl();
      const response = await fetch(`${apiUrl}/extensions/batch-validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          license_key: licenseKey,
          prompts_count: promptsCount
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: BatchValidateResponse = await response.json();
      
      // Кэшировать успешный response
      if (data.allowed) {
        await this.cachePermission(data);
      }
      
      return data;
      
    } catch (error) {
      console.error('Batch validation failed:', error);
      
      // Graceful degradation - использовать кэш
      return await this.handleAPIError(error);
    }
  }
  
  /**
   * Списать один кредит за успешно отправленный промпт
   * 
   * Вызывается сразу после успешной отправки промпта в Discord.
   * Кредиты списываются только при успешной отправке, не при ошибках.
   * 
   * @param sessionToken - Token сессии
   * @param promptIndex - Индекс промпта в сессии (0-based)
   */
  async deductCredit(
    sessionToken: string,
    promptIndex: number
  ): Promise<DeductCreditResponse> {
    try {
      const apiUrl = await getApiBaseUrl();
      const response = await fetch(`${apiUrl}/extensions/deduct-credit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_token: sessionToken,
          prompt_index: promptIndex
        })
      });
      
      if (!response.ok) {
        // Пытаемся получить детальное сообщение об ошибке от сервера
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          // Если не удалось распарсить JSON, используем статус
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      
      // Проверяем что сервер вернул success: true
      if (!result.success) {
        throw new Error(result.message || 'Server returned success: false');
      }
      
      return result;
      
    } catch (error: any) {
      console.error('Deduct credit failed:', error);
      
      // Пробрасываем ошибку дальше для обработки в service-worker
      throw error;
    }
  }
  
  /**
   * Финализация сессии
   * 
   * Вызывается после завершения работы.
   * 
   * ВАЖНО: Кредиты уже списаны через deductCredit при успешной отправке каждого промпта.
   * Этот метод только финализирует сессию.
   * 
   * @param sessionToken - Token сессии
   * @param promptsSent - Фактически отправлено промптов
   * @param errorsCount - Количество ошибок
   * @param durationSeconds - Длительность сессии
   */
  async finalizeSession(
    sessionToken: string,
    promptsSent: number,
    errorsCount: number = 0,
    durationSeconds?: number
  ): Promise<FinalizeSessionResponse> {
    try {
      const apiUrl = await getApiBaseUrl();
      const response = await fetch(`${apiUrl}/extensions/finalize-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_token: sessionToken,
          prompts_sent: promptsSent,
          errors_count: errorsCount,
          duration_seconds: durationSeconds
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('Finalize session failed:', error);
      
      // Не критично, если финализация не прошла
      // Сервер может списать зарезервированные кредиты автоматически
      return {
        success: false,
        message: 'Failed to finalize session',
        credits_used: promptsSent,
        credits_remaining: 0
      };
    }
  }
  
  /**
   * Health Check для проверки доступности API
   * 
   * Используется для graceful degradation.
   * Ultra-fast endpoint (< 100ms).
   */
  async healthCheck(): Promise<boolean> {
    try {
      const apiUrl = await getApiBaseUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`${apiUrl}/extensions/health`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
      
    } catch (error) {
      console.warn('Health check failed:', error);
      return false;
    }
  }
  
  /**
   * Получить баланс пользователя
   * 
   * @param licenseKey - Лицензионный ключ
   */
  async getBalance(licenseKey: string): Promise<{
    balance: number;
    subscription_expires: string | null;
    monthly_limit: number | null;
    used_this_month: number;
  }> {
    const apiUrl = await getApiBaseUrl();
    const response = await fetch(`${apiUrl}/extensions/balance`, {
      method: 'GET',
      headers: {
        'X-License-Key': licenseKey
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  }
  
  /**
   * Привязать лицензию к устройству (fingerprinting)
   * 
   * Опционально. Включается на сервере.
   */
  async bindLicense(
    licenseKey: string,
    fingerprint: string,
    deviceInfo?: Record<string, string>
  ): Promise<{
    status: string;
    message?: string;
    devices_count?: number;
  }> {
    const apiUrl = await getApiBaseUrl();
    const response = await fetch(`${apiUrl}/extensions/bind-license`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        license_key: licenseKey,
        fingerprint,
        device_info: deviceInfo
      })
    });
    
    return await response.json();
  }
  
  // ==================== GRACEFUL DEGRADATION ====================
  
  /**
   * Обработка ошибок API с graceful degradation
   * 
   * Использует кэшированные разрешения при недоступности API.
   */
  private async handleAPIError(error: any): Promise<BatchValidateResponse> {
    console.warn('⚠️ API unavailable, attempting graceful degradation...');
    
    // Проверить кэш
    const cached = await this.getCachedPermission();
    
    if (cached && Date.now() < cached.cached_at + cached.ttl_ms) {
      console.warn('✅ Using cached permission (valid for ' + 
        Math.round((cached.cached_at + cached.ttl_ms - Date.now()) / 1000) + 's)');
      
      return {
        allowed: true,
        session_token: cached.session_token,
        config: cached.config,
        message: 'Working in offline mode (cached)'
      };
    }
    
    // Кэш устарел - блокировать
    throw new Error(
      'API unavailable and cache expired. Please check your internet connection.'
    );
  }
  
  /**
   * Кэшировать разрешение в chrome.storage.local
   */
  private async cachePermission(data: BatchValidateResponse): Promise<void> {
    const cached: CachedPermission = {
      ...data,
      cached_at: Date.now(),
      ttl_ms: CACHE_TTL_MS
    };
    
    await chrome.storage.local.set({ cached_permission: cached });
  }
  
  /**
   * Получить кэшированное разрешение
   */
  private async getCachedPermission(): Promise<CachedPermission | null> {
    const result = await chrome.storage.local.get('cached_permission');
    return result.cached_permission || null;
  }
  
}

// Singleton instance
export const apiClient = new ExtensionAPIClient();

