/**
 * Popup UI для расширения Chrome
 * 
 * Использует batch validation для защиты
 */

import { startAutomation, AutomationResult } from './utils/automation';
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
  delayMax: 60   // По умолчанию 60 секунд
};

// Дополнительное состояние для настроек
interface SettingsState {
  offlineMode: boolean;
  customSelector: string;
  discordStatus: string | null;
}

let settingsState: SettingsState = {
  offlineMode: false,
  customSelector: '',
  discordStatus: null
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
  await loadState();
  render();
  setupEventListeners();
});

/**
 * Загрузить состояние из chrome.storage
 */
async function loadState(): Promise<void> {
  const result = await chrome.storage.local.get([
    'license_key', 
    'prompts', 
    'delay_min', 
    'delay_max',
    'offline_mode',
    'custom_discord_selector'
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
  
  // Загрузить настройки
  if (result.offline_mode !== undefined) {
    settingsState.offlineMode = result.offline_mode;
  }
  if (result.custom_discord_selector) {
    settingsState.customSelector = result.custom_discord_selector;
  }
  
  // Загрузить баланс если есть ключ и не offline режим
  if (state.licenseKey && !settingsState.offlineMode) {
    try {
      const balanceData = await apiClient.getBalance(state.licenseKey);
      state.balance = balanceData.balance;
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  }
}

/**
 * Сохранить состояние в chrome.storage
 */
async function saveState(): Promise<void> {
  await chrome.storage.local.set({
    license_key: state.licenseKey,
    prompts: state.prompts,
    delay_min: state.delayMin,
    delay_max: state.delayMax,
    offline_mode: settingsState.offlineMode,
    custom_discord_selector: settingsState.customSelector
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
  const copyKeyButton = document.getElementById('copy-key-btn') as HTMLButtonElement;
  
  if (licenseInput) {
    licenseInput.addEventListener('input', (e) => {
      state.licenseKey = (e.target as HTMLInputElement).value;
      saveState();
      updateBalance();
    });
  }
  
  if (promptsTextarea) {
    promptsTextarea.addEventListener('input', (e) => {
      const text = (e.target as HTMLTextAreaElement).value;
      // Сохранить сырой текст, очистка будет при отправке
      state.prompts = text.split('\n').filter(p => p.trim().length > 0);
      saveState();
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
  
  if (copyKeyButton) {
    copyKeyButton.addEventListener('click', () => {
      navigator.clipboard.writeText(state.licenseKey);
      showNotification('Ключ скопирован!');
    });
  }
  
  // Кнопка проверки Discord
  const testDiscordButton = document.getElementById('test-discord-btn') as HTMLButtonElement;
  if (testDiscordButton) {
    testDiscordButton.addEventListener('click', handleTestDiscord);
  }
  
  // Настройки
  const offlineModeCheckbox = document.getElementById('offline-mode') as HTMLInputElement;
  if (offlineModeCheckbox) {
    offlineModeCheckbox.checked = settingsState.offlineMode;
    offlineModeCheckbox.addEventListener('change', (e) => {
      settingsState.offlineMode = (e.target as HTMLInputElement).checked;
      saveState();
      render();
    });
  }
  
  const customSelectorInput = document.getElementById('custom-selector') as HTMLInputElement;
  if (customSelectorInput) {
    customSelectorInput.value = settingsState.customSelector;
    customSelectorInput.addEventListener('input', (e) => {
      settingsState.customSelector = (e.target as HTMLInputElement).value;
      saveState();
    });
  }
  
  const resetSettingsButton = document.getElementById('reset-settings-btn') as HTMLButtonElement;
  if (resetSettingsButton) {
    resetSettingsButton.addEventListener('click', handleResetSettings);
  }
}

/**
 * Обработчик проверки Discord
 */
async function handleTestDiscord(): Promise<void> {
  settingsState.discordStatus = 'Проверка...';
  render();
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.id) {
      settingsState.discordStatus = '❌ Не удалось получить активную вкладку';
      render();
      return;
    }
    
    // Проверить что вкладка - Discord
    if (!tab.url || !tab.url.includes('discord.com')) {
      settingsState.discordStatus = '❌ Откройте страницу Discord (discord.com)';
      render();
      return;
    }
    
    // Попытаться отправить сообщение в content script
    let messageSent = false;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'TEST_INPUT' });
      messageSent = true;
    } catch (sendError: any) {
      // Content script не загружен - инжектировать программно
      console.log('Content script not loaded, injecting...', sendError);
      
      try {
        // Инжектировать content script
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        
        // Подождать немного для загрузки
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Попробовать снова
        await chrome.tabs.sendMessage(tab.id, { type: 'TEST_INPUT' });
        messageSent = true;
      } catch (injectError: any) {
        settingsState.discordStatus = `❌ Не удалось загрузить скрипт: ${injectError.message}. Перезагрузите страницу Discord.`;
        render();
        return;
      }
    }
    
    if (!messageSent) {
      settingsState.discordStatus = '❌ Не удалось отправить сообщение';
      render();
      return;
    }
    
    // Ждать ответа
    const listener = (message: any) => {
      if (message.type === 'TEST_RESULT') {
        chrome.runtime.onMessage.removeListener(listener);
        settingsState.discordStatus = message.message || 
          (message.found ? '✅ Поле найдено!' : '❌ Поле не найдено');
        render();
        
        // Очистить статус через 5 секунд
        setTimeout(() => {
          settingsState.discordStatus = null;
          render();
        }, 5000);
      }
    };
    
    chrome.runtime.onMessage.addListener(listener);
    
    // Timeout через 10 секунд
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
      if (settingsState.discordStatus === 'Проверка...') {
        settingsState.discordStatus = '❌ Таймаут проверки';
        render();
      }
    }, 10000);
    
  } catch (error: any) {
    settingsState.discordStatus = `❌ Ошибка: ${error.message}`;
    render();
  }
}

/**
 * Обработчик сброса настроек
 */
async function handleResetSettings(): Promise<void> {
  if (confirm('Сбросить все настройки?')) {
    settingsState.offlineMode = false;
    settingsState.customSelector = '';
    await chrome.storage.local.remove(['offline_mode', 'custom_discord_selector', 'last_successful_selector']);
    saveState();
    render();
    showNotification('Настройки сброшены');
  }
}

/**
 * Обработчик Start
 */
async function handleStart(): Promise<void> {
  if (!state.licenseKey && !settingsState.offlineMode) {
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
    const result: AutomationResult = await startAutomation(
      cleanedPrompts,
      state.licenseKey || 'offline_key',
      (current, total, status) => {
        state.currentPrompt = current;
        state.totalPrompts = total;
        state.status = status;
        render();
      },
      {
        delayMinSeconds: state.delayMin,
        delayMaxSeconds: state.delayMax
      }
    );
    
    if (result.success) {
      state.status = `✅ Завершено: ${result.prompts_sent}/${state.totalPrompts} отправлено`;
      if (result.errors_count && result.errors_count > 0) {
        state.status += ` (${result.errors_count} ошибок)`;
      }
      
      // Обновить баланс
      await updateBalance();
    } else {
      state.error = result.message;
      state.status = 'Ошибка';
    }
    
  } catch (error: any) {
    state.error = error.message || 'Unknown error';
    state.status = 'Ошибка';
  } finally {
    state.isRunning = false;
    render();
  }
}

/**
 * Обработчик Pause
 */
function handlePause(): void {
  // TODO: Реализовать паузу
  state.status = 'Paused';
  state.isRunning = false;
  render();
}

/**
 * Обработчик Stop
 */
function handleStop(): void {
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
  
  app.innerHTML = `
    <div class="header">
      <h1>Midjourney Auto</h1>
      ${state.balance !== null ? `<div class="balance">Баланс: ${state.balance} кредитов</div>` : ''}
      ${settingsState.offlineMode ? `<div class="balance" style="background: rgba(255, 193, 7, 0.3); margin-top: 4px;">⚠️ Offline Mode</div>` : ''}
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
        <button id="copy-key-btn" class="btn-secondary" ${state.isRunning ? 'disabled' : ''}>
          📋
        </button>
      </div>
    </div>
    
    <div class="section">
      <label for="prompts">Промпты (по одному на строку)</label>
      <textarea 
        id="prompts" 
        rows="8" 
        placeholder="Введите промпты, каждый с новой строки..."
        ${state.isRunning ? 'disabled' : ''}
      >${state.prompts.join('\n')}</textarea>
      <div class="prompts-count">${state.prompts.length} промптов</div>
    </div>
    
    <div class="section">
      <button 
        id="test-discord-btn" 
        class="btn-secondary"
        ${state.isRunning ? 'disabled' : ''}
      >
        🔍 Проверить Discord
      </button>
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
            max="600" 
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
            max="600" 
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
        ❌ ${state.error}
      </div>
    ` : ''}
    
    <div class="section settings-section">
      <h3>⚙️ Настройки</h3>
      
      <label class="checkbox-label">
        <input 
          type="checkbox" 
          id="offline-mode"
          ${state.isRunning ? 'disabled' : ''}
        />
        <span>Offline Mode (без API)</span>
      </label>
      
      <label for="custom-selector" style="margin-top: 12px; display: block;">
        Custom Discord Selector
      </label>
      <input 
        type="text" 
        id="custom-selector" 
        placeholder="div[role='textbox']"
        value="${settingsState.customSelector}"
        ${state.isRunning ? 'disabled' : ''}
      />
      <div class="settings-hint">
        Оставьте пустым для автопоиска
      </div>
      
      <button 
        id="reset-settings-btn" 
        class="btn-secondary"
        style="margin-top: 8px; width: 100%;"
        ${state.isRunning ? 'disabled' : ''}
      >
        Сбросить настройки
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
  if (message.type === 'OFFLINE_MODE') {
    state.status = '⚠️ ' + message.message;
    render();
  }
});

