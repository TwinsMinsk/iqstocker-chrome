/**
 * Service Worker для Chrome Extension
 * 
 * Обрабатывает фоновые задачи и сообщения.
 *
 * Ключевая задача: надёжная очередь отправки промптов в MV3.
 * - Popup может закрываться в любой момент → логика должна жить в SW.
 * - SW может "засыпать" → используем chrome.alarms для пробуждения.
 * - Content script может быть не загружен → PING + авто-инжект.
 */

import { apiClient, BatchValidateResponse } from './utils/api-client';
import { generateFingerprint, getDeviceInfo } from './utils/fingerprint';

// Проверка доступности Chrome API
if (typeof chrome === 'undefined' || !chrome.runtime) {
  console.error('❌ Chrome extension APIs not available');
} else {
  // ==================== QUEUE STATE ====================
  type QueueStatus =
    | 'idle'
    | 'validating'
    | 'sending'
    | 'paused'
    | 'stopped'
    | 'done'
    | 'error';

  interface QueueState {
    status: QueueStatus;
    tab_id?: number;
    prompts: string[];
    current_index: number; // 0..prompts.length
    sent_count: number;
    errors_count: number;
    started_at?: number;
    session_token?: string;
    session_config?: BatchValidateResponse['config'];
    license_key?: string;
    delay_min_sec: number;
    delay_max_sec: number;
    last_error?: string;
    next_run_at?: number; // epoch ms
    api_health?: 'ok' | 'down';
    is_sending?: boolean;  // Флаг: идет ли сейчас отправка промпта (защита от одновременной отправки)
    sending_started_at?: number;  // Время начала отправки (для таймаута)
  }

  const STORAGE_KEY = 'queue_state_v1';
  const ALARM_NEXT = 'queueNext';
  const ALARM_HEALTH = 'healthCheck';

  const DEFAULT_DELAY_MIN_SEC = 30;
  const DEFAULT_DELAY_MAX_SEC = 60;

  async function getState(): Promise<QueueState> {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const s = result[STORAGE_KEY] as QueueState | undefined;
    return (
      s || {
        status: 'idle',
        prompts: [],
        current_index: 0,
        sent_count: 0,
        errors_count: 0,
        delay_min_sec: DEFAULT_DELAY_MIN_SEC,
        delay_max_sec: DEFAULT_DELAY_MAX_SEC,
      }
    );
  }

  async function setState(patch: Partial<QueueState>): Promise<QueueState> {
    const current = await getState();
    const next = { ...current, ...patch };
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
    // Пушим обновление в UI, если popup открыт
    chrome.runtime.sendMessage({ type: 'QUEUE_STATE', state: next }).catch(() => {});
    return next;
  }

  async function clearNextAlarm(): Promise<void> {
    if (chrome.alarms?.clear) {
      await chrome.alarms.clear(ALARM_NEXT);
    }
  }

  function getRandomDelayMs(minSec: number, maxSec: number): number {
    const min = Math.min(minSec, maxSec);
    const max = Math.max(minSec, maxSec);
    const sec = Math.floor(Math.random() * (max - min + 1)) + min;
    return sec * 1000;
  }

  /**
   * Сравнить версии расширения (semantic versioning).
   * 
   * @param current Версия из manifest.json (например "1.0.1")
   * @param required Минимальная требуемая версия (например "1.0.2")
   * @returns -1 если current < required, 0 если равны, 1 если current > required
   */
  function compareVersions(current: string, required: string): number {
    const currentParts = current.split('.').map(Number);
    const requiredParts = required.split('.').map(Number);
    
    for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const requiredPart = requiredParts[i] || 0;
      
      if (currentPart < requiredPart) return -1;
      if (currentPart > requiredPart) return 1;
    }
    
    return 0;
  }

  /**
   * Умный backoff для ошибок (exponential + jitter).
   * 
   * Используется при rate limit (429) и других повторяющихся ошибках.
   * 
   * @param attemptNumber Номер попытки (1, 2, 3...)
   * @param baseDelayMs Базовая задержка в миллисекундах (по умолчанию 10 секунд)
   * @param maxDelayMs Максимальная задержка (по умолчанию 5 минут)
   * @returns Задержка в миллисекундах с jitter
   */
  function calculateBackoffDelay(
    attemptNumber: number,
    baseDelayMs: number = 10000,
    maxDelayMs: number = 300000
  ): number {
    // Exponential: 10s, 20s, 40s, 80s, 160s, 300s (cap)
    const exponential = Math.min(
      baseDelayMs * Math.pow(2, attemptNumber - 1),
      maxDelayMs
    );
    
    // Jitter: добавляем случайность ±30%, чтобы избежать синхронизации
    const jitterRange = exponential * 0.3;
    const jitter = (Math.random() * 2 - 1) * jitterRange; // -30% до +30%
    
    return Math.round(exponential + jitter);
  }

  /**
   * Найти и активировать вкладку Discord для отправки промптов
   * 
   * В фоновом режиме важно:
   * 1. Найти правильную вкладку Discord
   * 2. Активировать её (чтобы content script мог работать)
   * 3. Убедиться что вкладка готова к работе
   */
  async function ensureDiscordTab(): Promise<number> {
    const state = await getState();
    let targetTabId: number | undefined;

    // 1) Если tab_id сохранён, убедиться что вкладка ещё существует и валидна
    if (state.tab_id) {
      try {
        const tab = await chrome.tabs.get(state.tab_id);
        if (tab?.url && tab.url.includes('discord.com') && tab.id) {
          // Проверить что вкладка не в процессе загрузки
          if (tab.status === 'complete') {
            targetTabId = tab.id;
          }
        }
      } catch {
        // Вкладка закрыта или недоступна
      }
    }

    // 2) Если сохранённая вкладка не подходит, ищем новую
    if (!targetTabId) {
      // Сначала попробуем активную вкладку
      const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (active?.id && active.url?.includes('discord.com') && active.status === 'complete') {
        targetTabId = active.id;
      } else {
        // Ищем любую готовую вкладку Discord
        const tabs = await chrome.tabs.query({ url: 'https://discord.com/*' });
        if (tabs?.length) {
          // Предпочитаем вкладки, которые уже загружены
          const readyTab = tabs.find(t => t.status === 'complete' && t.id) || tabs.find(t => t.id);
          if (readyTab?.id) {
            targetTabId = readyTab.id;
          }
        }
      }
    }

    if (!targetTabId) {
      throw new Error('Откройте Discord (discord.com) и выберите чат с Midjourney.');
    }

    // 3) Активируем вкладку для фонового режима
    // Это важно, чтобы content script мог работать корректно
    try {
      await chrome.tabs.update(targetTabId, { active: true });
      // Небольшая пауза для активации вкладки
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      // Если не удалось активировать (например, нет прав), продолжаем
      console.warn('Не удалось активировать вкладку:', e);
    }

    // 4) Сохраняем tab_id для следующих итераций
    if (targetTabId !== state.tab_id) {
      await setState({ tab_id: targetTabId });
    }

    return targetTabId;
  }

  // ==================== CONTENT SCRIPT: PING + INJECT ====================
  async function sendMessageToTab<T = any>(tabId: number, message: any): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        const err = chrome.runtime.lastError;
        if (err) return reject(new Error(err.message));
        resolve(response as T);
      });
    });
  }

  /**
   * Убедиться что content script загружен и готов к работе
   * 
   * В фоновом режиме content script может быть не загружен,
   * особенно если вкладка была неактивна.
   */
  async function ensureContentScript(tabId: number): Promise<void> {
    // Проверить состояние вкладки перед инжектом
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab || tab.status !== 'complete') {
        throw new Error(`Вкладка ${tabId} не готова (status: ${tab?.status})`);
      }
    } catch (e: any) {
      throw new Error(`Вкладка ${tabId} недоступна: ${e.message}`);
    }

    // Пробуем отправить PING - если content script уже загружен
    try {
      await sendMessageToTab(tabId, { type: 'PING' });
      return;
    } catch {
      // Content script не загружен - инжектим
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js'],
        });
        // Пауза для инициализации content script
        await new Promise(r => setTimeout(r, 500));
        
        // Проверяем что content script ответил
        await sendMessageToTab(tabId, { type: 'PING' });
      } catch (e: any) {
        throw new Error(`Не удалось загрузить content script на вкладку ${tabId}: ${e.message}`);
      }
    }
  }

  // ==================== QUEUE PROCESSING ====================
  async function scheduleNextRun(delayMs: number): Promise<void> {
    const when = Date.now() + delayMs;
    await setState({ next_run_at: when });
    chrome.alarms.create(ALARM_NEXT, { when });
  }

  async function stopQueue(reason: QueueStatus, errorMessage?: string): Promise<void> {
    await clearNextAlarm();
    await setState({
      status: reason,
      last_error: errorMessage,
      next_run_at: undefined,
      is_sending: false,  // Сбросить флаг отправки при остановке
      sending_started_at: undefined,
    });
  }

  /**
   * Best-effort привязка лицензии к устройству (fingerprinting).
   *
   * - На сервере это опционально (FINGERPRINTING_ENABLED).
   * - Если включено и устройств больше лимита → сервер вернёт approval_required.
   * - Мы в этом случае останавливаем очередь и показываем понятную ошибку.
   *
   * Важно: fingerprint не хранит чувствительные данные и не является "tracking" — это защита лицензии.
   */
  async function bindDeviceIfNeeded(licenseKey?: string): Promise<void> {
    if (!licenseKey) return;

    try {
      const fingerprint = await generateFingerprint();
      const deviceInfo = getDeviceInfo();
      const resp = await apiClient.bindLicense(licenseKey, fingerprint, deviceInfo);

      // Возможные статусы backend:
      // - disabled / already_bound / bound / approval_required / error
      if (resp?.status === 'approval_required') {
        throw new Error(resp.message || 'Требуется подтверждение устройства для этой лицензии');
      }
      if (resp?.status === 'error') {
        throw new Error(resp.message || 'Не удалось привязать устройство');
      }

      // Сохраним fingerprint локально (полезно для диагностики и будущих проверок)
      await chrome.storage.local.set({ saved_fingerprint: fingerprint });
    } catch (e) {
      // Не спамим логами, но дадим понять что произошло (если это критично — упадёт выше)
      throw e;
    }
  }

  async function processNext(): Promise<void> {
    const state = await getState();

    if (state.status === 'paused' || state.status === 'stopped') return;
    if (state.status !== 'sending') return;
    
    // ЗАЩИТА: Если предыдущий промпт еще отправляется, ждем его завершения
    if (state.is_sending) {
      const sendingStarted = state.sending_started_at || 0;
      const elapsed = Date.now() - sendingStarted;
      const TIMEOUT_MS = 120000; // 2 минуты таймаут на отправку (на случай зависания)
      
      if (elapsed > TIMEOUT_MS) {
        // Таймаут - считаем что отправка зависла, сбрасываем флаг
        console.warn('⚠️ Sending timeout detected, resetting is_sending flag');
        await setState({ 
          is_sending: false, 
          sending_started_at: undefined,
          last_error: 'Таймаут отправки предыдущего промпта'
        });
        // Планируем повтор через 5 секунд
        await scheduleNextRun(5000);
        return;
      }
      
      // Еще идет отправка - перенесем на следующую проверку через 1 секунду
      console.log('⏳ Previous prompt still sending, waiting...');
      await scheduleNextRun(1000);
      return;
    }
    
    if (state.current_index >= state.prompts.length) {
      // Завершить + попытаться финализировать сессию
      try {
        if (state.session_token) {
          const durationSec = state.started_at
            ? Math.round((Date.now() - state.started_at) / 1000)
            : undefined;
          await apiClient.finalizeSession(
            state.session_token,
            state.sent_count,
            state.errors_count,
            durationSec
          );
        }
      } catch (e: any) {
        // Не критично
        console.warn('Finalize session failed:', e?.message || e);
      }
      await stopQueue('done');
      return;
    }

    try {
      // Установить флаг отправки ПЕРЕД началом отправки
      await setState({ 
        is_sending: true, 
        sending_started_at: Date.now() 
      });
      
      // Найти и активировать вкладку Discord
      const tabId = await ensureDiscordTab();
      
      // Убедиться что content script загружен и готов
      await ensureContentScript(tabId);

      // Дополнительная защита от дублирования: проверяем что индекс корректный
      if (state.current_index >= state.prompts.length) {
        console.warn('⚠️ current_index out of bounds, skipping');
        await setState({ is_sending: false, sending_started_at: undefined });
        return;
      }

      const prompt = state.prompts[state.current_index];
      const promptIndex = state.current_index;
      
      console.log(`📤 Sending prompt ${promptIndex + 1}/${state.prompts.length} (index ${promptIndex}) to tab ${tabId}: ${prompt.substring(0, 50)}...`);
      
      // TYPE_PROMPT делает имитацию печатания или paste+enter внутри страницы
      // Мы ждем завершения через специальный механизм событий
      // ВАЖНО: Проверяем не только текст промпта, но и индекс, чтобы избежать дублирования
      const completionPromise = new Promise<{ ok: boolean; error?: string }>((resolve) => {
        const listener = (msg: any) => {
          // Проверяем что это ответ именно для нашего промпта и индекса
          if (msg.type === 'PROMPT_COMPLETED' && msg.prompt === prompt && msg.prompt_index === promptIndex) {
            chrome.runtime.onMessage.removeListener(listener);
            resolve({ ok: msg.ok, error: msg.error });
          } else if (msg.type === 'PROMPT_COMPLETED' && msg.prompt === prompt) {
            // Если индекс не указан, но промпт совпадает - тоже принимаем (обратная совместимость)
            chrome.runtime.onMessage.removeListener(listener);
            resolve({ ok: msg.ok, error: msg.error });
          }
        };
        chrome.runtime.onMessage.addListener(listener);
        
        // Увеличенный таймаут для фонового режима (вкладка может быть неактивна)
        setTimeout(() => {
          chrome.runtime.onMessage.removeListener(listener);
          resolve({ ok: false, error: 'Таймаут ожидания завершения ввода (90с). Возможно, вкладка Discord неактивна.' });
        }, 90000); // 90 секунд вместо 60
      });

      // Отправляем сообщение в content script
      // ВАЖНО: Включаем индекс промпта для защиты от дублирования
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: 'TYPE_PROMPT',
          text: prompt,
          prompt_index: promptIndex, // Добавляем индекс для идентификации
          use_typing: true,
        });
      } catch (e: any) {
        // Если не удалось отправить сообщение, возможно вкладка закрылась
        throw new Error(`Не удалось отправить сообщение на вкладку ${tabId}: ${e.message}`);
      }

      const resp = await completionPromise;

      if (!resp?.ok) {
        // Сбросить флаг при ошибке
        await setState({ 
          is_sending: false, 
          sending_started_at: undefined 
        });
        throw new Error(resp?.error || 'Не удалось отправить промпт в Discord');
      }

      // Промпт успешно отправлен в Discord - списать кредит
      // ВАЖНО: Кредиты списываются только при успешной отправке, не при ошибках
      // ВАЖНО: Если списание кредита не удалось, мы НЕ останавливаем очередь,
      // а только логируем ошибку и продолжаем. Кредит можно списать позже при финализации.
      
      let creditDeducted = false;
      let creditDeductionError: string | null = null;
      
      if (state.session_token) {
        // Получаем актуальное состояние перед списанием для проверки session_token
        const currentState = await getState();
        if (currentState.session_token) {
          // Используем индекс промпта, который только что был отправлен
          const promptIndexToDeduct = state.current_index;
          const sessionTokenToUse = currentState.session_token;

          // Списание кредита с повторными попытками
          let deductResult = null;
          let deductAttempts = 0;
          const maxDeductAttempts = 3;
          
          while (deductAttempts < maxDeductAttempts && !deductResult?.success) {
            try {
              deductAttempts++;
              console.log(`💰 Attempting to deduct credit (attempt ${deductAttempts}/${maxDeductAttempts}) for prompt index ${promptIndexToDeduct}...`);
              
              deductResult = await apiClient.deductCredit(
                sessionTokenToUse,
                promptIndexToDeduct
              );
              
              if (deductResult.success) {
                console.log(`✅ Credit deducted successfully! Remaining: ${deductResult.credits_remaining}, Deducted: ${deductResult.credits_deducted || 1}`);
                creditDeducted = true;
                break;
              } else {
                console.warn(`⚠️ Deduct credit attempt ${deductAttempts} failed: ${deductResult.message}`);
                creditDeductionError = deductResult.message || 'Unknown error';
                
                // Если это не последняя попытка, ждем перед повторной попыткой
                if (deductAttempts < maxDeductAttempts) {
                  const retryDelay = Math.min(1000 * Math.pow(2, deductAttempts - 1), 5000);
                  console.log(`⏳ Retrying credit deduction in ${retryDelay}ms...`);
                  await new Promise(r => setTimeout(r, retryDelay));
                }
              }
            } catch (e: any) {
              console.error(`❌ Credit deduction attempt ${deductAttempts} error:`, e?.message || e);
              creditDeductionError = e?.message || 'Unknown error';
              
              // Если это не последняя попытка, ждем перед повторной попыткой
              if (deductAttempts < maxDeductAttempts) {
                const retryDelay = Math.min(1000 * Math.pow(2, deductAttempts - 1), 5000);
                await new Promise(r => setTimeout(r, retryDelay));
              }
            }
          }
        } else {
          creditDeductionError = 'Session token отсутствует в текущем состоянии';
          console.warn('⚠️ Cannot deduct credit: session_token is missing in current state');
        }
      } else {
        creditDeductionError = 'Session token отсутствует';
        console.warn('⚠️ Cannot deduct credit: session_token is missing');
      }

      // ВАЖНО: Увеличиваем индекс и продолжаем работу даже если списание кредита не удалось
      // Промпт уже отправлен в Discord, поэтому мы должны перейти к следующему
      // Кредит можно списать позже при финализации сессии или при следующей попытке
      const nextState = await setState({
        current_index: state.current_index + 1,
        sent_count: state.sent_count + 1,
        is_sending: false,
        sending_started_at: undefined,
      });

      // Логируем результат
      if (creditDeducted) {
        console.log(`✅ Prompt ${state.current_index + 1} sent and credit deducted successfully`);
      } else {
        console.warn(`⚠️ Prompt ${state.current_index + 1} sent successfully, but credit deduction failed: ${creditDeductionError || 'Unknown error'}`);
        console.warn('⚠️ Credit will be deducted later during session finalization or on next attempt');
        // НЕ увеличиваем errors_count, так как промпт был успешно отправлен
        // Только логируем для отладки
      }

      // Планируем следующий шаг
      if (nextState.current_index < nextState.prompts.length) {
        // Правильно объединяем пользовательский и серверный диапазоны
        // чтобы сохранить рандомизацию и учесть серверные ограничения
        const userMinSec = nextState.delay_min_sec;
        const userMaxSec = nextState.delay_max_sec;
        const serverMinMs = nextState.session_config?.min_interval_ms;
        const serverMaxMs = nextState.session_config?.max_interval_ms;
        
        let finalMinSec: number;
        let finalMaxSec: number;
        
        if (typeof serverMinMs === 'number' && Number.isFinite(serverMinMs)) {
          const serverMinSec = serverMinMs / 1000;
          const serverMaxSec = typeof serverMaxMs === 'number' && Number.isFinite(serverMaxMs)
            ? serverMaxMs / 1000
            : Infinity;
          
          // Объединяем диапазоны: берем максимум из минимумов и минимум из максимумов
          finalMinSec = Math.max(userMinSec, serverMinSec);
          finalMaxSec = Math.min(userMaxSec, serverMaxSec);
          
          // Если пользовательский диапазон полностью меньше серверного минимума,
          // используем серверный диапазон (если есть максимум) или только минимум
          if (finalMinSec > finalMaxSec) {
            finalMinSec = serverMinSec;
            finalMaxSec = Number.isFinite(serverMaxSec) ? serverMaxSec : serverMinSec * 2;
          }
        } else {
          // Серверных ограничений нет - используем пользовательский диапазон
          finalMinSec = userMinSec;
          finalMaxSec = userMaxSec;
        }
        
        // Генерируем случайное число в итоговом диапазоне
        const delayMs = getRandomDelayMs(finalMinSec, finalMaxSec);
        console.log(`⏱️ Случайная задержка: ${Math.round(delayMs / 1000)} сек (диапазон: ${Math.round(finalMinSec)}-${Math.round(finalMaxSec)} сек)`);
        await scheduleNextRun(delayMs);
      } else {
        // Всё отправили — добьём на следующем тике, чтобы централизованно финализировать
        await scheduleNextRun(10);
      }
    } catch (e: any) {
      // Сбросить флаг отправки при ошибке
      await setState({ 
        is_sending: false, 
        sending_started_at: undefined 
      });
      
      const msg = e?.message || 'Unknown error';
      const nextErrors = state.errors_count + 1;
      await setState({
        errors_count: nextErrors,
        last_error: msg,
      });

      // Если есть config с max_retries — остановиться
      const maxRetries = state.session_config?.max_retries;
      if (maxRetries !== undefined && nextErrors >= maxRetries) {
        await stopQueue('error', `Слишком много ошибок (${nextErrors}). Последняя: ${msg}`);
        return;
      }

      // ==================== УМНЫЙ BACKOFF ====================
      // Проверяем тип ошибки для выбора стратегии backoff
      const isRateLimit = msg.includes('429') || 
                         msg.includes('rate limit') || 
                         msg.includes('rate_limit') ||
                         msg.toLowerCase().includes('too many requests');
      
      const isTabError = msg.includes('вкладка') || 
                        msg.includes('tab') || 
                        msg.includes('недоступна') ||
                        msg.includes('не готова') ||
                        msg.includes('Таймаут');

      let delayMs: number;
      if (isRateLimit) {
        // Для rate limit используем exponential backoff + jitter
        delayMs = calculateBackoffDelay(nextErrors, 10000, 300000);
        console.log(`⏱️ Rate limit detected (attempt ${nextErrors}). Waiting ${Math.round(delayMs / 1000)}s before retry...`);
      } else if (isTabError) {
        // Для ошибок вкладки - короткая пауза и попытка найти другую вкладку
        delayMs = 3000;
        console.log(`⚠️ Tab error detected. Will try to find another Discord tab in ${delayMs / 1000}s...`);
        // Сбросим tab_id чтобы найти новую вкладку
        await setState({ tab_id: undefined });
      } else {
        // Для других ошибок — фиксированная пауза 5 секунд
        delayMs = 5000;
      }

      await scheduleNextRun(delayMs);
    }
  }

  // ==================== TAB MANAGEMENT ====================
  /**
   * Обработка закрытия вкладок Discord
   * Если закрыта вкладка, на которой работала очередь, нужно найти новую
   */
  if (chrome.tabs && chrome.tabs.onRemoved) {
    chrome.tabs.onRemoved.addListener(async (tabId) => {
      const state = await getState();
      if (state.tab_id === tabId && state.status === 'sending') {
        console.log(`⚠️ Discord tab ${tabId} closed. Looking for another tab...`);
        // Сбросим tab_id чтобы при следующей итерации найти новую вкладку
        await setState({ tab_id: undefined });
        // Если очередь активна, продолжим через короткое время
        if (state.status === 'sending') {
          await scheduleNextRun(2000);
        }
      }
    });
  }

  /**
   * Обработка обновления вкладок
   * Если вкладка Discord обновилась (перезагрузилась), нужно перезагрузить content script
   */
  if (chrome.tabs && chrome.tabs.onUpdated) {
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url?.includes('discord.com')) {
        const state = await getState();
        // Если это наша рабочая вкладка, убедимся что content script загружен
        if (state.tab_id === tabId && state.status === 'sending') {
          console.log(`🔄 Discord tab ${tabId} reloaded. Ensuring content script...`);
          try {
            await ensureContentScript(tabId);
          } catch (e) {
            console.warn('Failed to reload content script after tab update:', e);
          }
        }
      }
    });
  }

  // Установка расширения
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      console.log('✅ Midjourney Auto extension installed');
      // Приветственное сообщение - пользователь может открыть popup вручную
    } else if (details.reason === 'update') {
      console.log('✅ Midjourney Auto extension updated');
    }
  });

  // Обработка сообщений (Popup → SW)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
      try {
        if (!message?.type) return;

        if (message.type === 'QUEUE_STATUS_REQUEST') {
          const state = await getState();
          sendResponse({ ok: true, state });
          return;
        }

        if (message.type === 'QUEUE_STOP') {
          await stopQueue('stopped');
          sendResponse({ ok: true });
          return;
        }

        if (message.type === 'QUEUE_PAUSE') {
          await clearNextAlarm();
          await setState({ 
            status: 'paused', 
            next_run_at: undefined,
            is_sending: false,  // Сбросить флаг отправки при паузе
            sending_started_at: undefined,
          });
          sendResponse({ ok: true });
          return;
        }

        if (message.type === 'QUEUE_RESUME') {
          const s = await getState();
          if (s.status !== 'paused') {
            sendResponse({ ok: true });
            return;
          }
          await setState({ status: 'sending', last_error: undefined });
          // Запуск сразу
          await scheduleNextRun(10);
          sendResponse({ ok: true });
          return;
        }

        if (message.type === 'QUEUE_START') {
          const prompts: string[] = Array.isArray(message.prompts) ? message.prompts : [];
          const licenseKey: string | undefined = message.license_key || undefined;
          const delayMin = Number(message.delay_min_sec) || DEFAULT_DELAY_MIN_SEC;
          const delayMax = Number(message.delay_max_sec) || DEFAULT_DELAY_MAX_SEC;

          if (prompts.length === 0) {
            throw new Error('Список промптов пуст');
          }

          // Проверить, находится ли очередь в режиме паузы
          const currentState = await getState();
          const isPaused = currentState.status === 'paused';
          
          // Если пауза - возобновляем с текущего места
          if (isPaused && currentState.prompts.length > 0 && currentState.current_index < currentState.prompts.length) {
            console.log(`🔄 Возобновление с промпта ${currentState.current_index + 1}/${currentState.prompts.length}`);
            await setState({ 
              status: 'sending',
              last_error: undefined,
              is_sending: false,
              sending_started_at: undefined
            });
            // Запуск сразу
            await scheduleNextRun(10);
            sendResponse({ ok: true });
            return;
          }

          // Остановить предыдущую очередь (если не пауза)
          await clearNextAlarm();

          const startedAt = Date.now();
          await setState({
            status: 'validating',
            prompts,
            current_index: 0,
            sent_count: 0,
            errors_count: 0,
            started_at: startedAt,
            session_token: undefined,
            session_config: undefined,
            license_key: licenseKey,
            delay_min_sec: Math.max(1, delayMin),
            delay_max_sec: Math.max(1, delayMax),
            last_error: undefined,
            next_run_at: undefined,
          });

          // Валидация (batch)
          const session = await apiClient.batchValidate(licenseKey || '', prompts.length);
          if (!session.allowed) {
            await stopQueue('error', session.message || session.error || 'Validation failed');
            sendResponse({ ok: false, error: session.message || session.error || 'Validation failed' });
            return;
          }

          // ==================== VERSION CHECK ====================
          if (session.min_version_required) {
            const manifestVersion = chrome.runtime.getManifest().version;
            if (compareVersions(manifestVersion, session.min_version_required) < 0) {
              const errorMsg = `Требуется обновление расширения. Установлена версия ${manifestVersion}, требуется ${session.min_version_required}. Обновите расширение в chrome://extensions`;
              await stopQueue('error', errorMsg);
              sendResponse({ ok: false, error: errorMsg });
              return;
            }
          }

          // ==================== REMOTE SELECTOR ====================
          // Сохранить remote selector с сервера (если есть) для использования в content script
          if (session.config?.discord_input_selector) {
            await chrome.storage.local.set({
              remote_discord_selector: session.config.discord_input_selector,
              remote_selector_updated_at: Date.now()
            });
            console.log('✅ Remote selector saved from server:', session.config.discord_input_selector);
          }

          // Привязка к устройству (если на сервере включено) — делаем после валидации,
          // чтобы получить понятные ошибки "по лицензии", а не только "по fingerprint".
          try {
            await bindDeviceIfNeeded(licenseKey);
          } catch (e: any) {
            const msg = e?.message || 'Не удалось привязать устройство';
            await stopQueue('error', msg);
            sendResponse({ ok: false, error: msg });
            return;
          }

          await setState({
            status: 'sending',
            session_token: session.session_token,
            session_config: session.config,
          });

          // Стартуем сразу (через alarm, чтобы гарантированно пережить sleep)
          await scheduleNextRun(10);
          sendResponse({ ok: true });
          return;
        }
      } catch (e: any) {
        const msg = e?.message || 'Unknown error';
        await setState({ status: 'error', last_error: msg });
        sendResponse({ ok: false, error: msg });
      }
    })();

    // Важно: async sendResponse
    return true;
  });

  // Периодическая проверка здоровья API
  if (chrome.alarms && chrome.alarms.create) {
    try {
      chrome.alarms.create(ALARM_HEALTH, { periodInMinutes: 5 });
    } catch (error) {
      console.warn('Failed to create alarm:', error);
    }
  }

  if (chrome.alarms && chrome.alarms.onAlarm) {
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm && alarm.name === ALARM_HEALTH) {
        // Реальный health check: если API недоступен, не ломаем очередь,
        // но обновляем состояние и показываем предупреждение (graceful degradation).
        apiClient
          .healthCheck()
          .then(async (ok) => {
            await setState({ api_health: ok ? 'ok' : 'down' });
          })
          .catch(async () => {
            await setState({ api_health: 'down' });
          });
      }
      if (alarm && alarm.name === ALARM_NEXT) {
        processNext().catch((e) => console.error('processNext failed', e));
      }
    });
  }

  // Логирование для отладки
  console.log('✅ Midjourney Auto service worker loaded');
}

