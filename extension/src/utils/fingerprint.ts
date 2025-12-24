/**
 * Device Fingerprinting для привязки лицензии к устройству
 * 
 * ОПЦИОНАЛЬНО: Включается на сервере через FINGERPRINTING_ENABLED
 * 
 * Документация: См. Docs/SECURITY_PROTECTION_GUIDE.md
 */

export interface DeviceInfo {
  os: string;
  browser: string;
  screen_resolution: string;
  timezone: string;
  language: string;
  hardware_concurrency: number;
}

/**
 * Генерировать fingerprint устройства
 * 
 * Использует неизменяемые характеристики браузера/ОС.
 * НЕ используется для tracking, только для защиты лицензии.
 * 
 * @returns SHA-256 hash fingerprint (32 символа)
 */
export async function generateFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    // В MV3 service worker может не быть screen. Делаем безопасный fallback.
    typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : 'screen:unknown',
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || 'unknown',
    // НЕ используем canvas fingerprinting (слишком инвазивно)
  ];
  
  const data = components.join('|');
  
  // SHA-256 hash
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Return first 32 characters
  return hashHex.slice(0, 32);
}

/**
 * Получить информацию об устройстве
 * 
 * Используется для отображения в админ панели и email уведомлениях.
 */
export function getDeviceInfo(): DeviceInfo {
  return {
    os: getOS(),
    browser: getBrowser(),
    screen_resolution:
      typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : 'unknown',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    hardware_concurrency: navigator.hardwareConcurrency || 0
  };
}

/**
 * Определить ОС
 */
function getOS(): string {
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Win')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  
  return 'Unknown';
}

/**
 * Определить браузер
 */
function getBrowser(): string {
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
  if (userAgent.includes('Edg')) return 'Edge';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
  
  return 'Unknown';
}

/**
 * Проверить, изменился ли fingerprint с момента последней привязки
 * 
 * Используется для обнаружения VPN/новый браузер.
 */
export async function checkFingerprintChanged(): Promise<boolean> {
  const currentFingerprint = await generateFingerprint();
  
  // Получить сохранённый fingerprint
  const result = await chrome.storage.local.get('saved_fingerprint');
  const savedFingerprint = result.saved_fingerprint;
  
  if (!savedFingerprint) {
    // Первый запуск - сохранить
    await chrome.storage.local.set({ saved_fingerprint: currentFingerprint });
    return false;
  }
  
  return currentFingerprint !== savedFingerprint;
}

