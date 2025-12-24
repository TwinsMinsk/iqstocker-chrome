/**
 * Automation logic с защитой через batch validation
 * 
 * Документация: См. Docs/SECURITY_PROTECTION_GUIDE.md
 */

import { apiClient, BatchValidateResponse } from './api-client';

export interface AutomationResult {
  success: boolean;
  message: string;
  prompts_sent?: number;
  errors_count?: number;
  duration_seconds?: number;
}

export interface AutomationOptions {
  delayMinSeconds?: number;  // Минимальная задержка в секундах
  delayMaxSeconds?: number;  // Максимальная задержка в секундах
}

/**
 * Отправить промпт в Discord
 * 
 * Эта функция должна быть реализована в content script.
 * Здесь только интерфейс.
 */
async function sendToDiscord(prompt: string): Promise<void> {
  // Отправить сообщение в content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.id) {
    throw new Error('No active tab');
  }
  
  await chrome.tabs.sendMessage(tab.id, {
    type: 'SEND_PROMPT',
    prompt: prompt
  });
  
  // Ждать подтверждения от content script
  return new Promise((resolve, reject) => {
    const listener = (message: any) => {
      if (message.type === 'PROMPT_SENT') {
        chrome.runtime.onMessage.removeListener(listener);
        resolve();
      } else if (message.type === 'PROMPT_ERROR') {
        chrome.runtime.onMessage.removeListener(listener);
        reject(new Error(message.error));
      }
    };
    
    chrome.runtime.onMessage.addListener(listener);
    
    // Timeout 10 seconds
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
      reject(new Error('Prompt send timeout'));
    }, 10000);
  });
}

/**
 * Sleep утилита
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Генерирует случайное время задержки в миллисекундах из диапазона
 */
function getRandomDelay(minSeconds: number, maxSeconds: number): number {
  const min = Math.min(minSeconds, maxSeconds);
  const max = Math.max(minSeconds, maxSeconds);
  const randomSeconds = Math.floor(Math.random() * (max - min + 1)) + min;
  return randomSeconds * 1000; // Конвертируем в миллисекунды
}

/**
 * 🔥 Главная функция автоматизации с защитой
 * 
 * Использует batch validation для минимизации API запросов.
 * Работает по принципу:
 * 1. Один запрос в начале (batch-validate)
 * 2. Отправка промптов БЕЗ API запросов
 * 3. Один запрос в конце (finalize-session)
 * 
 * @param prompts - Массив промптов для отправки
 * @param licenseKey - Лицензионный ключ
 * @param onProgress - Callback для отображения прогресса
 * @returns Результат автоматизации
 */
export async function startAutomation(
  prompts: string[],
  licenseKey: string,
  onProgress?: (current: number, total: number, status: string) => void,
  options?: AutomationOptions
): Promise<AutomationResult> {
  
  const startTime = Date.now();
  let sentCount = 0;
  let errorsCount = 0;
  let sessionToken: string | undefined;
  let sessionConfig: BatchValidateResponse['config'];
  
  try {
    // ==================== STEP 1: BATCH VALIDATION ====================
    onProgress?.(0, prompts.length, 'Validating license...');
    
    const session = await apiClient.batchValidate(licenseKey, prompts.length);
    
    if (!session.allowed) {
      return {
        success: false,
        message: session.message || session.error || 'Validation failed'
      };
    }
    
    sessionToken = session.session_token;
    sessionConfig = session.config;
    
    console.log(`✅ Session validated. Credits reserved: ${session.credits_reserved || 'N/A (offline)'}`);
    console.log(`⚙️ Config: interval ${sessionConfig?.min_interval_ms}ms, max retries ${sessionConfig?.max_retries}`);
    
    // Сохранить session в storage для Resume функции
    await chrome.storage.local.set({
      current_session: {
        session_token: sessionToken,
        prompts: prompts,
        sent_count: 0,
        started_at: Date.now()
      }
    });
    
    // ==================== STEP 2: SEND PROMPTS ====================
    onProgress?.(0, prompts.length, 'Sending prompts...');
    
    for (let i = 0; i < prompts.length; i++) {
      try {
        // Отправить промпт в Discord
        await sendToDiscord(prompts[i]);
        sentCount++;
        
        onProgress?.(sentCount, prompts.length, `Sent ${sentCount}/${prompts.length}`);
        
        // Обновить прогресс в storage
        await chrome.storage.local.set({
          current_session: {
            session_token: sessionToken,
            prompts: prompts,
            sent_count: sentCount,
            started_at: Date.now()
          }
        });
        
        // Интервал между промптами
        if (i < prompts.length - 1) {
          let delayMs: number;
          
          // Использовать пользовательский диапазон, если указан
          if (options?.delayMinSeconds !== undefined && options?.delayMaxSeconds !== undefined) {
            delayMs = getRandomDelay(options.delayMinSeconds, options.delayMaxSeconds);
            console.log(`⏱️ Случайная задержка: ${Math.round(delayMs / 1000)} секунд`);
          } else if (sessionConfig) {
            // Иначе использовать настройки с сервера
            delayMs = sessionConfig.min_interval_ms;
          } else {
            // Дефолтная задержка 30 секунд
            delayMs = 30000;
          }
          
          await sleep(delayMs);
        }
        
      } catch (error) {
        console.error(`❌ Error sending prompt ${i + 1}:`, error);
        errorsCount++;
        
        onProgress?.(sentCount, prompts.length, `Error: ${error.message}`);
        
        // Проверить максимум ошибок
        if (sessionConfig && errorsCount >= sessionConfig.max_retries) {
          console.warn(`⚠️ Max retries (${sessionConfig.max_retries}) reached. Stopping.`);
          break;
        }
        
        // Пауза перед следующей попыткой
        await sleep(5000);
      }
    }
    
    // ==================== STEP 3: FINALIZE SESSION ====================
    onProgress?.(sentCount, prompts.length, 'Finalizing session...');
    
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    
    if (sessionToken) {
      const finalizeResult = await apiClient.finalizeSession(
        sessionToken,
        sentCount,
        errorsCount,
        durationSeconds
      );
      
      console.log(`✅ Session finalized. Credits used: ${finalizeResult.credits_used}`);
      console.log(`💰 Credits remaining: ${finalizeResult.credits_remaining}`);
    }
    
    // Очистить session из storage
    await chrome.storage.local.remove('current_session');
    
    // ==================== RETURN RESULT ====================
    return {
      success: true,
      message: `Successfully sent ${sentCount}/${prompts.length} prompts`,
      prompts_sent: sentCount,
      errors_count: errorsCount,
      duration_seconds: durationSeconds
    };
    
  } catch (error) {
    console.error('❌ Automation failed:', error);
    
    // Попытаться финализировать сессию даже при ошибке
    if (sessionToken && sentCount > 0) {
      try {
        const durationSeconds = Math.round((Date.now() - startTime) / 1000);
        await apiClient.finalizeSession(sessionToken, sentCount, errorsCount, durationSeconds);
      } catch (finalizeError) {
        console.error('Failed to finalize session:', finalizeError);
      }
    }
    
    return {
      success: false,
      message: error.message || 'Unknown error',
      prompts_sent: sentCount,
      errors_count: errorsCount
    };
  }
}

/**
 * Resume функция - продолжить с сохранённой сессии
 * 
 * Используется если браузер был закрыт во время отправки.
 */
export async function resumeAutomation(
  onProgress?: (current: number, total: number, status: string) => void
): Promise<AutomationResult> {
  
  // Получить сохранённую сессию
  const result = await chrome.storage.local.get('current_session');
  const session = result.current_session;
  
  if (!session) {
    return {
      success: false,
      message: 'No saved session found'
    };
  }
  
  console.log(`🔄 Resuming session. Already sent: ${session.sent_count}/${session.prompts.length}`);
  
  // Продолжить с того места где остановились
  const remainingPrompts = session.prompts.slice(session.sent_count);
  
  // TODO: Получить license key из storage
  const licenseKey = ''; // Implement this
  
  return await startAutomation(remainingPrompts, licenseKey, onProgress);
}

