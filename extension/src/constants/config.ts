/**
 * Extension Configuration
 * 
 * Централизованная конфигурация для production/development
 */

// Production API URL (Custom Domain)
export const PRODUCTION_API_URL = 'https://api.iqstocker.com/api/v1';

// Development API URL (локальный сервер)
export const DEVELOPMENT_API_URL = 'http://localhost:8000/api/v1';

// Автоопределение: если расширение загружено из chrome://extensions в режиме разработчика,
// используем development URL, иначе - production
export function getDefaultApiUrl(): string {
  // В production расширение всегда должно использовать production URL
  // Пользователь может переопределить через настройки в popup
  return PRODUCTION_API_URL;
}

// Минимальная версия расширения (для проверки на сервере)
export const EXTENSION_VERSION = '1.0.2';

// Таймауты и retry
export const API_TIMEOUT_MS = 10000; // 10 секунд
export const API_RETRY_COUNT = 3;
export const API_RETRY_DELAY_MS = 1000;

// Cache TTL
export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут

