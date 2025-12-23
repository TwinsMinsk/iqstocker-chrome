/**
 * API Client для расширения с batch validation и graceful degradation
 * 
 * Документация: См. Docs/SECURITY_PROTECTION_GUIDE.md
 */

export interface ExtensionConfig {
  min_interval_ms: number;
  max_interval_ms: number;
  max_retries: number;
}

export interface BatchValidateResponse {
  allowed: boolean;
  session_token?: string;
  expires_at?: string;
  config?: ExtensionConfig;
  credits_reserved?: number;
  credits_remaining?: number;
  error?: string;
  message?: string;
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

// API URL - можно переопределить через chrome.storage или использовать по умолчанию
const DEFAULT_API_BASE_URL = 'http://localhost:8000/api/v1';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Получить API URL из storage или использовать по умолчанию
async function getApiBaseUrl(): Promise<string> {
  const result = await chrome.storage.local.get('api_base_url');
  return result.api_base_url || DEFAULT_API_BASE_URL;
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
    // Проверить offline режим из настроек
    const settings = await chrome.storage.local.get('offline_mode');
    if (settings.offline_mode) {
      console.log('⚠️ Offline mode enabled - skipping API call');
      // Вернуть моковый response
      return {
        allowed: true,
        session_token: `offline_${Date.now()}`,
        config: {
          min_interval_ms: 30000,
          max_interval_ms: 60000,
          max_retries: 3
        },
        credits_reserved: promptsCount,
        message: 'Offline mode enabled'
      };
    }

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
   * Финализация сессии
   * 
   * Вызывается после завершения работы.
   * Корректирует кредиты если отправлено меньше промптов.
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
    // Пропустить финализацию в offline режиме
    const settings = await chrome.storage.local.get('offline_mode');
    if (settings.offline_mode || sessionToken.startsWith('offline_')) {
      console.log('⚠️ Offline mode - skipping finalize session');
      return {
        success: true,
        message: 'Offline mode - session not finalized',
        credits_used: promptsSent,
        credits_remaining: 0
      };
    }

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
      
      // Показать предупреждение пользователю
      this.showOfflineWarning();
      
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
  
  /**
   * Показать предупреждение об offline режиме
   */
  private showOfflineWarning(): void {
    // Отправить сообщение popup для отображения warning
    chrome.runtime.sendMessage({
      type: 'OFFLINE_MODE',
      message: 'Working in offline mode. Will sync when API is available.'
    });
  }
}

// Singleton instance
export const apiClient = new ExtensionAPIClient();

