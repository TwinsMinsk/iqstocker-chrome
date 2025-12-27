/**
 * Popup UI для расширения Chrome
 * 
 * Использует batch validation для защиты
 */

import { apiClient } from './utils/api-client';
import { cleanPrompts, parsePromptsFromText } from './utils/prompt-cleaner';

// Состояние UI
interface UIState {
  licenseKey: string;
  prompts: string[];
  isRunning: boolean;
  currentPrompt: number;
  totalPrompts: number;
  status: string;
  balance: number | null;
  error: string | null;
  delayMin: number;  // Минимальная задержка в секундах
  delayMax: number;  // Максимальная задержка в секундах
  keyValidationStatus: 'idle' | 'checking' | 'valid' | 'invalid' | null;  // Статус проверки ключа
  keyValidationMessage: string | null;  // Сообщение о результате проверки
}

let state: UIState = {
  licenseKey: '',
  prompts: [],
  isRunning: false,
  currentPrompt: 0,
  totalPrompts: 0,
  status: 'Ready',
  balance: null,
  error: null,
  delayMin: 30,  // По умолчанию 30 секунд
  delayMax: 60,   // По умолчанию 60 секунд
  keyValidationStatus: null,
  keyValidationMessage: null
};

// Дополнительное состояние для настроек
interface SettingsState {
  discordStatus: string | null;
}

let settingsState: SettingsState = {
  discordStatus: null
};

// Флаг для отслеживания изменений промптов
let promptsChangeTimeout: number | null = null;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
  await loadState();
  render();
  setupEventListeners();
  // Синхронизировать UI с текущим состоянием очереди в SW (если она уже запущена)
  try {
    const resp = await chrome.runtime.sendMessage({ type: 'QUEUE_STATUS_REQUEST' });
    if (resp?.ok && resp.state) {
      const s = resp.state as any;
      state.totalPrompts = Array.isArray(s.prompts) ? s.prompts.length : 0;
      state.currentPrompt = typeof s.current_index === 'number' ? s.current_index : 0;
      state.isRunning = s.status === 'sending' || s.status === 'validating';
      state.status = mapQueueStatusToText(s);
      state.error = s.last_error || null;
      render();
    }
  } catch {
    // ignore
  }
});

/**
 * Загрузить состояние из chrome.storage
 */
async function loadState(): Promise<void> {
  const result = await chrome.storage.local.get([
    'license_key', 
    'prompts', 
    'delay_min', 
    'delay_max'
  ]);
  
  if (result.license_key) {
    state.licenseKey = result.license_key;
  }
  
  if (result.prompts) {
    state.prompts = result.prompts;
  }
  
  // Загрузить настройки задержки
  if (result.delay_min !== undefined) {
    state.delayMin = result.delay_min;
  }
  if (result.delay_max !== undefined) {
    state.delayMax = result.delay_max;
  }
  
  // НЕ загружаем баланс автоматически при старте
  // Баланс будет загружен только после нажатия "Применить"
  // Это позволяет пользователю сначала ввести ключ, а потом проверить его
}

/**
 * Сохранить состояние в chrome.storage
 */
async function saveState(): Promise<void> {
  await chrome.storage.local.set({
    license_key: state.licenseKey,
    prompts: state.prompts,
    delay_min: state.delayMin,
    delay_max: state.delayMax
  });
}

/**
 * Настроить обработчики событий
 */
function setupEventListeners(): void {
  const licenseInput = document.getElementById('license-key') as HTMLInputElement;
  const promptsTextarea = document.getElementById('prompts') as HTMLTextAreaElement;
  const delayMinInput = document.getElementById('delay-min') as HTMLInputElement;
  const delayMaxInput = document.getElementById('delay-max') as HTMLInputElement;
  const startButton = document.getElementById('start-btn') as HTMLButtonElement;
  const pauseButton = document.getElementById('pause-btn') as HTMLButtonElement;
  const stopButton = document.getElementById('stop-btn') as HTMLButtonElement;
  const applyKeyButton = document.getElementById('apply-key-btn') as HTMLButtonElement;
  
  if (licenseInput) {
    licenseInput.addEventListener('input', (e) => {
      state.licenseKey = (e.target as HTMLInputElement).value;
      saveState();
      // Сбросить статус валидации при изменении ключа
      state.keyValidationStatus = null;
      state.keyValidationMessage = null;
      // Не сбрасываем balance сразу - он обновится при нажатии "Применить"
      render();
    });
  }
  
  if (promptsTextarea) {
    promptsTextarea.addEventListener('input', (e) => {
      const text = (e.target as HTMLTextAreaElement).value;
      // Сохранить ВСЕ строки (включая пустые) - они нужны как разделители промптов
      state.prompts = text.split('\n');
      saveState();
      render();
    });
  }
  
  if (delayMinInput) {
    delayMinInput.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value) || 0;
      state.delayMin = Math.max(1, value); // Минимум 1 секунда
      if (state.delayMin > state.delayMax) {
        state.delayMax = state.delayMin;
        if (delayMaxInput) delayMaxInput.value = state.delayMax.toString();
      }
      saveState();
    });
  }
  
  if (delayMaxInput) {
    delayMaxInput.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value) || 0;
      state.delayMax = Math.max(state.delayMin, value); // Не меньше минимума
      saveState();
    });
  }
  
  if (startButton) {
    startButton.addEventListener('click', handleStart);
  }
  
  if (pauseButton) {
    pauseButton.addEventListener('click', handlePause);
  }
  
  if (stopButton) {
    stopButton.addEventListener('click', handleStop);
  }
  
  if (applyKeyButton) {
    applyKeyButton.addEventListener('click', handleApplyKey);
  }
  
  // Кнопка форматирования промптов
  const formatPromptsButton = document.getElementById('format-prompts-btn') as HTMLButtonElement;
  if (formatPromptsButton) {
    formatPromptsButton.addEventListener('click', handleFormatPrompts);
  }
  
  // Кнопки поиска Discord
  const autoSearchButton = document.getElementById('auto-search-btn') as HTMLButtonElement;
  if (autoSearchButton) {
    autoSearchButton.addEventListener('click', handleAutoSearch);
  }

  const manualSearchButton = document.getElementById('manual-search-btn') as HTMLButtonElement;
  if (manualSearchButton) {
    manualSearchButton.addEventListener('click', handleManualSearch);
  }
  
  const refreshButton = document.getElementById('refresh-btn') as HTMLButtonElement;
  if (refreshButton) {
    refreshButton.addEventListener('click', handleRefresh);
  }
  
  // Обработчик изменения промптов для валидации кредитов
  if (promptsTextarea) {
    promptsTextarea.addEventListener('input', handlePromptsChange);
  }
}

/**
 * Обработчик изменения промптов - валидация кредитов
 */
function handlePromptsChange(e: Event): void {
  const textarea = e.target as HTMLTextAreaElement;
  const text = textarea.value;
  state.prompts = text.split('\n');
  
  // Отложенная валидация (debounce 500мс)
  if (promptsChangeTimeout) {
    clearTimeout(promptsChangeTimeout);
  }
  
  promptsChangeTimeout = window.setTimeout(() => {
    validateCreditsForPrompts();
    render();
  }, 500);
}

/**
 * Валидация кредитов для текущих промптов
 */
function validateCreditsForPrompts(): void {
  if (state.balance === null || state.prompts.length === 0) {
    // Если нет баланса или промптов, очищаем ошибку
    if (state.error && state.error.includes('credits')) {
      state.error = null;
    }
    return;
  }
  
  // Подсчитать валидные промпты
  const fullText = state.prompts.join('\n');
  const parsedPrompts = parsePromptsFromText(fullText);
  const validPromptsCount = cleanPrompts(parsedPrompts).length;
  
  // Проверить достаточно ли кредитов
  if (validPromptsCount > state.balance) {
    state.error = `❌ Need ${validPromptsCount} credits, have ${state.balance}`;
  } else {
    // Если кредитов достаточно, убираем ошибку о кредитах
    if (state.error && state.error.includes('credits')) {
      state.error = null;
    }
  }
}

/**
 * Обработчик кнопки "Обновить" - обновляет UI, очищает ошибки, но сохраняет ключ и промпты
 */
async function handleRefresh(): Promise<void> {
  // Сохранить ключ и промпты
  const savedKey = state.licenseKey;
  const savedPrompts = state.prompts;
  const savedDelayMin = state.delayMin;
  const savedDelayMax = state.delayMax;
  
  // Сбросить ошибки и статусы
  state.error = null;
  state.keyValidationStatus = null;
  state.keyValidationMessage = null;
  state.status = 'Ready';
  state.currentPrompt = 0;
  state.totalPrompts = 0;
  settingsState.discordStatus = null;
  
  // Восстановить сохраненные данные
  state.licenseKey = savedKey;
  state.prompts = savedPrompts;
  state.delayMin = savedDelayMin;
  state.delayMax = savedDelayMax;
  
  // Если есть ключ, обновить баланс
  if (state.licenseKey) {
    await updateBalance();
    // Валидировать кредиты после обновления баланса
    validateCreditsForPrompts();
  }
  
  render();
}

/**
 * Обработчик Авто-поиска Discord
 */
async function handleAutoSearch(): Promise<void> {
  settingsState.discordStatus = 'Авто-поиск...';
  render();
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.id || !tab.url?.includes('discord.com')) {
      settingsState.discordStatus = '❌ Откройте вкладку Discord';
      render();
      return;
    }
    
    await ensureContentScript(tab.id);
    await chrome.tabs.sendMessage(tab.id, { type: 'TEST_INPUT', picker: false });
    
    setupStatusListener();
  } catch (error: any) {
    settingsState.discordStatus = `❌ Ошибка: ${error.message}`;
    render();
  }
}

/**
 * Обработчик Ручного-поиска Discord
 */
async function handleManualSearch(): Promise<void> {
  settingsState.discordStatus = 'Выберите элемент...';
  render();
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.id || !tab.url?.includes('discord.com')) {
      settingsState.discordStatus = '❌ Откройте вкладку Discord';
      render();
      return;
    }
    
    await ensureContentScript(tab.id);
    await chrome.tabs.sendMessage(tab.id, { type: 'TEST_INPUT', picker: true });
    
    setupStatusListener();
  } catch (error: any) {
    settingsState.discordStatus = `❌ Ошибка: ${error.message}`;
    render();
  }
}

/**
 * Вспомогательная функция для проверки и инъекции content script
 */
async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'PING' });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Глобальная переменная для хранения текущего listener поиска
let currentSearchListener: ((message: any) => void) | null = null;
let searchListenerTimeout: number | null = null;

/**
 * Установка слушателя для результатов поиска
 */
function setupStatusListener(): void {
  // Удаляем предыдущий listener если он есть
  if (currentSearchListener) {
    chrome.runtime.onMessage.removeListener(currentSearchListener);
    currentSearchListener = null;
  }
  
  // Очищаем предыдущий таймаут
  if (searchListenerTimeout !== null) {
    clearTimeout(searchListenerTimeout);
    searchListenerTimeout = null;
  }
  
  currentSearchListener = (message: any) => {
    // Обрабатываем только TEST_RESULT сообщения
    if (message.type === 'TEST_RESULT') {
      // Удаляем listener сразу при получении результата
      if (currentSearchListener) {
        chrome.runtime.onMessage.removeListener(currentSearchListener);
        currentSearchListener = null;
      }
      
      // Очищаем таймаут
      if (searchListenerTimeout !== null) {
        clearTimeout(searchListenerTimeout);
        searchListenerTimeout = null;
      }
      
      if (message.found) {
        if (message.selector) {
          settingsState.discordStatus = `✅ Найдено! Селектор: ${message.selector}`;
        } else {
          settingsState.discordStatus = '✅ Поле найдено и подсвечено';
        }
      } else {
        // Показать ошибку, если она есть в сообщении
        settingsState.discordStatus = message.error ? `❌ Ошибка: ${message.error}` : (message.message || '❌ Не удалось найти поле');
      }
      render();
      
      setTimeout(() => {
        settingsState.discordStatus = null;
        render();
      }, 8000);
    }
  };
  
  chrome.runtime.onMessage.addListener(currentSearchListener);
  
  // Таймаут для удаления listener если ответ не пришел
  searchListenerTimeout = window.setTimeout(() => {
    if (currentSearchListener) {
      chrome.runtime.onMessage.removeListener(currentSearchListener);
      currentSearchListener = null;
      searchListenerTimeout = null;
      // Сбрасываем статус если ответ не пришел
      if (settingsState.discordStatus === 'Авто-поиск...' || settingsState.discordStatus === 'Выберите элемент...') {
        settingsState.discordStatus = null;
        render();
      }
    }
  }, 30000); // 30 секунд таймаут
}

/**
 * Обработчик форматирования промптов
 */
function handleFormatPrompts(): void {
  const promptsTextarea = document.getElementById('prompts') as HTMLTextAreaElement;
  if (!promptsTextarea) return;
  
  const text = promptsTextarea.value;
  
  if (!text.trim()) {
    showNotification('Введите промпты для форматирования');
    return;
  }
  
  // Парсим промпты
  const parsedPrompts = parsePromptsFromText(text);
  const cleanedPrompts = cleanPrompts(parsedPrompts);
  
  if (cleanedPrompts.length === 0) {
    showNotification('Не найдено валидных промптов');
    return;
  }
  
  // Форматируем: каждый промпт с номером + пустая строка
  const formatted = cleanedPrompts
    .map((prompt, index) => `${index + 1}. ${prompt}`)
    .join('\n\n');
  
  // Обновляем textarea
  promptsTextarea.value = formatted;
  state.prompts = formatted.split('\n');
  saveState();
  render();
  
  showNotification(`✓ Отформатировано ${cleanedPrompts.length} промптов`);
}

/**
 * Обработчик применения ключа (проверка валидности и получение баланса)
 */
async function handleApplyKey(): Promise<void> {
  const licenseKey = state.licenseKey.trim();
  
  if (!licenseKey) {
    state.keyValidationStatus = 'invalid';
    state.keyValidationMessage = 'Введите лицензионный ключ';
    render();
    return;
  }
  
  // Проверка формата ключа (должен начинаться с sk_live_)
  if (!licenseKey.startsWith('sk_live_')) {
    state.keyValidationStatus = 'invalid';
    state.keyValidationMessage = 'Неверный формат ключа. Ключ должен начинаться с sk_live_';
    state.balance = null;
    render();
    return;
  }
  
  // Установить статус "проверка"
  state.keyValidationStatus = 'checking';
  state.keyValidationMessage = 'Проверка ключа...';
  state.balance = null;
  render();
  
  try {
    // Проверить ключ через API (getBalance также валидирует ключ)
    const balanceData = await apiClient.getBalance(licenseKey);
    
    // Ключ валидный
    state.keyValidationStatus = 'valid';
    state.balance = balanceData.balance;
    state.keyValidationMessage = `✅ Ключ валиден. Баланс: ${balanceData.balance} кредитов`;
    
    // Сохранить ключ в storage
    await saveState();
    
  } catch (error: any) {
    // Ключ невалидный или ошибка API
    state.keyValidationStatus = 'invalid';
    state.balance = null;
    
    const errorMessage = error.message || 'Unknown error';
    if (errorMessage.includes('401') || errorMessage.includes('Invalid')) {
      state.keyValidationMessage = '❌ Неверный или неактивный ключ';
    } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
      state.keyValidationMessage = '❌ Ошибка подключения к серверу. Проверьте интернет';
    } else {
      state.keyValidationMessage = `❌ Ошибка: ${errorMessage}`;
    }
  }
  
  render();
}

/**
 * Обработчик Start
 */
async function handleStart(): Promise<void> {
  if (!state.licenseKey) {
    showError('Введите лицензионный ключ');
    return;
  }
  
  if (state.prompts.length === 0) {
    showError('Введите хотя бы один промпт');
    return;
  }
  
  // Очистить промпты перед отправкой
  // Сначала объединить весь текст и распарсить (на случай многострочных промптов)
  const fullText = state.prompts.join('\n');
  const parsedPrompts = parsePromptsFromText(fullText);
  const cleanedPrompts = cleanPrompts(parsedPrompts);
  
  if (cleanedPrompts.length === 0) {
    showError('После очистки не осталось валидных промптов');
    return;
  }
  
  console.log(`📝 Очищено промптов: ${state.prompts.length} → ${cleanedPrompts.length}`);
  
  state.isRunning = true;
  state.error = null;
  state.currentPrompt = 0;
  state.totalPrompts = cleanedPrompts.length;
  state.status = 'Starting...';
  render();
  
  try {
    // Стартуем очередь в Service Worker (MV3-safe)
    const resp = await chrome.runtime.sendMessage({
      type: 'QUEUE_START',
      prompts: cleanedPrompts,
      license_key: state.licenseKey || '',
      delay_min_sec: state.delayMin,
      delay_max_sec: state.delayMax
    });

    if (!resp?.ok) {
      throw new Error(resp?.error || 'Не удалось запустить очередь');
    }

    // Состояние дальше будет приходить через QUEUE_STATE
    state.status = '✅ Очередь запущена';
  } catch (error: any) {
    state.error = error.message || 'Unknown error';
    state.status = 'Ошибка';
  } finally {
    // isRunning будет управляться сообщениями от SW
    render();
  }
}

/**
 * Обработчик Pause
 */
function handlePause(): void {
  chrome.runtime.sendMessage({ type: 'QUEUE_PAUSE' }).catch(() => {});
  state.status = 'Paused';
  state.isRunning = false;
  render();
}

/**
 * Обработчик Stop
 */
function handleStop(): void {
  chrome.runtime.sendMessage({ type: 'QUEUE_STOP' }).catch(() => {});
  state.isRunning = false;
  state.status = 'Stopped';
  render();
}

/**
 * Обновить баланс
 */
async function updateBalance(): Promise<void> {
  if (!state.licenseKey) {
    state.balance = null;
    render();
    return;
  }
  
  try {
    const balanceData = await apiClient.getBalance(state.licenseKey);
    state.balance = balanceData.balance;
    render();
  } catch (error) {
    console.error('Failed to update balance:', error);
  }
}

/**
 * Рендер UI
 */
function render(): void {
  const app = document.getElementById('app');
  if (!app) return;
  
  const progress = state.totalPrompts > 0 
    ? Math.round((state.currentPrompt / state.totalPrompts) * 100) 
    : 0;
  
  // Подсчитать количество промптов для отображения
  const fullText = state.prompts.join('\n');
  const parsedPrompts = parsePromptsFromText(fullText);
  const validPromptsCount = cleanPrompts(parsedPrompts).length;
  
  app.innerHTML = `
    <div class="header">
      <h1>IQ Стокер Генеринг</h1>
      ${state.balance !== null ? `<div class="balance">Баланс: ${state.balance} кредитов</div>` : ''}
    </div>
    
    <div class="section">
      <label for="license-key">Лицензионный ключ</label>
      <div class="input-group">
        <input 
          type="text" 
          id="license-key" 
          placeholder="sk_live_..." 
          value="${state.licenseKey}"
          ${state.isRunning ? 'disabled' : ''}
        />
        <button id="apply-key-btn" class="btn-secondary" ${state.isRunning || state.keyValidationStatus === 'checking' ? 'disabled' : ''} title="Проверить и применить ключ">
          ${state.keyValidationStatus === 'checking' ? '⏳ Проверка...' : '✓ Применить'}
        </button>
      </div>
      ${state.keyValidationMessage ? `
        <div class="key-validation-message ${state.keyValidationStatus === 'valid' ? 'key-validation-success' : state.keyValidationStatus === 'invalid' ? 'key-validation-error' : ''}">
          ${state.keyValidationMessage}
        </div>
      ` : ''}
    </div>
    
    <div class="section">
      <label for="prompts">Промпты (по одному на строку)</label>
      <textarea 
        id="prompts" 
        rows="8" 
        placeholder="Введите промпты, каждый с новой строки..."
        ${state.isRunning ? 'disabled' : ''}
      >${state.prompts.join('\n')}</textarea>
      <div class="prompts-info">
        <span class="prompts-count">${validPromptsCount} промптов</span>
        <button 
          id="format-prompts-btn" 
          class="btn-format"
          ${state.isRunning ? 'disabled' : ''}
          title="Отформатировать и подсчитать промпты"
        >
          ✨ Форматировать
        </button>
      </div>
    </div>
    
    <div class="section">
      <div class="button-row">
        <button 
          id="auto-search-btn" 
          class="btn-secondary"
          ${state.isRunning ? 'disabled' : ''}
          title="Автоматически найти поле ввода Discord"
        >
          🤖 Авто-поиск
        </button>
        <button 
          id="manual-search-btn" 
          class="btn-secondary"
          ${state.isRunning ? 'disabled' : ''}
          title="Вручную выбрать поле ввода на странице"
        >
          🎯 Ручной-поиск
        </button>
      </div>
      ${settingsState.discordStatus ? `
        <div class="discord-status ${settingsState.discordStatus.includes('✅') ? 'success' : settingsState.discordStatus.includes('❌') ? 'error' : ''}">${settingsState.discordStatus}</div>
      ` : ''}
    </div>
    
    <div class="section">
      <label>Интервал отправки (секунды)</label>
      <div class="delay-range">
        <div class="delay-input-group">
          <label for="delay-min" class="delay-label">От:</label>
          <input 
            type="number" 
            id="delay-min" 
            min="1" 
            value="${state.delayMin}"
            ${state.isRunning ? 'disabled' : ''}
            class="delay-input"
          />
          <span class="delay-unit">сек</span>
        </div>
        <div class="delay-separator">—</div>
        <div class="delay-input-group">
          <label for="delay-max" class="delay-label">До:</label>
          <input 
            type="number" 
            id="delay-max" 
            min="1" 
            value="${state.delayMax}"
            ${state.isRunning ? 'disabled' : ''}
            class="delay-input"
          />
          <span class="delay-unit">сек</span>
        </div>
      </div>
      <div class="delay-hint">Случайное время в диапазоне для каждого промпта</div>
    </div>
    
    <div class="section">
      <div class="status-bar">
        <div class="status">${state.status}</div>
        ${state.totalPrompts > 0 ? `
          <div class="progress">
            <div class="progress-bar" style="width: ${progress}%"></div>
          </div>
          <div class="progress-text">${state.currentPrompt}/${state.totalPrompts}</div>
        ` : ''}
      </div>
    </div>
    
    ${state.error ? `
      <div class="error-message">
        ${state.error}
      </div>
    ` : ''}
    
    <div class="section">
      <button 
        id="refresh-btn" 
        class="btn-secondary"
        style="width: 100%;"
        ${state.isRunning ? 'disabled' : ''}
        title="Обновить окно (ключ и промпты сохранятся)"
      >
        🔄 Обновить
      </button>
    </div>
    
    <div class="section actions">
      <button 
        id="start-btn" 
        class="btn-primary"
        ${state.isRunning ? 'disabled' : ''}
      >
        ▶️ Start
      </button>
      <button 
        id="pause-btn" 
        class="btn-secondary"
        ${!state.isRunning ? 'disabled' : ''}
      >
        ⏸️ Pause
      </button>
      <button 
        id="stop-btn" 
        class="btn-danger"
        ${!state.isRunning ? 'disabled' : ''}
      >
        ⏹️ Stop
      </button>
    </div>
  `;
  
  // Переподключить обработчики после рендера
  setupEventListeners();
}

/**
 * Показать уведомление
 */
function showNotification(message: string): void {
  // Простое уведомление
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 2000);
}

/**
 * Показать ошибку
 */
function showError(message: string): void {
  state.error = message;
  render();
  setTimeout(() => {
    state.error = null;
    render();
  }, 5000);
}

// Слушать сообщения от service worker
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'QUEUE_STATE' && message.state) {
    const s = message.state as any;
    state.totalPrompts = Array.isArray(s.prompts) ? s.prompts.length : state.totalPrompts;
    state.currentPrompt = typeof s.current_index === 'number' ? s.current_index : state.currentPrompt;
    state.isRunning = s.status === 'sending' || s.status === 'validating';
    state.status = mapQueueStatusToText(s);
    state.error = s.last_error || null;
    render();

    // Если очередь завершилась — обновить баланс
    if (s.status === 'done') {
      updateBalance().catch(() => {});
    }
  }
});

/**
 * Привести статус очереди из SW к читаемому тексту.
 */
function mapQueueStatusToText(s: any): string {
  const status = s?.status;
  const idx = typeof s?.current_index === 'number' ? s.current_index : 0;
  const total = Array.isArray(s?.prompts) ? s.prompts.length : 0;
  const err = s?.last_error ? ` (❌ ${s.last_error})` : '';

  if (status === 'idle') return 'Ready';
  if (status === 'validating') return 'Проверка лицензии...';
  if (status === 'sending') return `Отправка... ${idx}/${total}`;
  if (status === 'paused') return `Пауза ${idx}/${total}`;
  if (status === 'stopped') return `Остановлено ${idx}/${total}`;
  if (status === 'done') return `✅ Завершено: ${total}/${total}`;
  if (status === 'error') return `Ошибка${err}`;
  return 'Ready';
}

