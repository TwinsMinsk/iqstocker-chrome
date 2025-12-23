/**
 * Content Script для Discord
 * 
 * Отправляет промпты в Discord через DOM манипуляции
 */

// Расширенный список селекторов для Discord
const DISCORD_SELECTORS = {
  input: [
    // Современные селекторы Discord (приоритет)
    'div[role="textbox"][data-slate-editor="true"]',
    'div[contenteditable="true"][class*="slateTextArea"]',
    'div[contenteditable="true"][class*="slateEditor"]',
    'div[contenteditable="true"][aria-label*="Message"]',
    'div[contenteditable="true"][aria-label*="Сообщение"]',
    'div[contenteditable="true"][role="textbox"]',
    'div[data-slate-editor="true"]',
    // Старые селекторы
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="Сообщение"]',
    'textarea[placeholder*="Napisz"]',
    'form input[type="text"]',
    // Общие fallback
    'div[contenteditable="true"]',
    'textarea'
  ],
  sendButton: [
    'button[aria-label*="Send"]',
    'button[aria-label*="Отправить"]',
    'button[aria-label*="Wyślij"]',
    'button[type="submit"]',
    'button[class*="send"]',
    'button:has(svg[class*="send"])',
    'button:has(svg[aria-label*="Send"])'
  ]
};

// ID для подсветки элемента
const HIGHLIGHT_ID = 'midjourney-auto-highlight';

/**
 * Загрузить кастомный селектор из настроек
 */
async function loadCustomSelector(): Promise<string | null> {
  const result = await chrome.storage.local.get('custom_discord_selector');
  return result.custom_discord_selector || null;
}

/**
 * Загрузить последний успешный селектор
 */
async function loadLastSuccessfulSelector(): Promise<string | null> {
  const result = await chrome.storage.local.get('last_successful_selector');
  return result.last_successful_selector || null;
}

/**
 * Сохранить успешный селектор
 */
async function saveSuccessfulSelector(selector: string): Promise<void> {
  await chrome.storage.local.set({ last_successful_selector: selector });
}

/**
 * Получить CSS селектор для элемента
 */
function getElementSelector(element: HTMLElement): string {
  // Попробовать получить уникальный селектор
  if (element.id) {
    return `#${element.id}`;
  }
  
  // Попробовать по классам
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.split(' ').filter(c => c.length > 0);
    if (classes.length > 0) {
      return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
    }
  }
  
  // Попробовать по атрибутам
  if (element.getAttribute('role')) {
    return `${element.tagName.toLowerCase()}[role="${element.getAttribute('role')}"]`;
  }
  
  if (element.getAttribute('data-slate-editor')) {
    return `${element.tagName.toLowerCase()}[data-slate-editor="true"]`;
  }
  
  // Fallback
  return element.tagName.toLowerCase();
}

/**
 * Подсветить элемент на странице
 */
function highlightElement(element: HTMLElement): void {
  // Удалить предыдущую подсветку
  const existing = document.getElementById(HIGHLIGHT_ID);
  if (existing) {
    existing.remove();
  }
  
  const rect = element.getBoundingClientRect();
  const highlight = document.createElement('div');
  highlight.id = HIGHLIGHT_ID;
  highlight.style.position = 'fixed';
  highlight.style.top = `${rect.top + window.scrollY}px`;
  highlight.style.left = `${rect.left + window.scrollX}px`;
  highlight.style.width = `${rect.width}px`;
  highlight.style.height = `${rect.height}px`;
  highlight.style.border = '3px solid #667eea';
  highlight.style.borderRadius = '4px';
  highlight.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
  highlight.style.pointerEvents = 'none';
  highlight.style.zIndex = '999999';
  highlight.style.transition = 'all 0.3s';
  
  document.body.appendChild(highlight);
  
  // Удалить через 3 секунды
  setTimeout(() => {
    highlight.style.opacity = '0';
    setTimeout(() => highlight.remove(), 300);
  }, 3000);
}

/**
 * Найти input поле в Discord
 * Приоритет: кастомный → последний успешный → автопоиск
 */
async function findInput(): Promise<HTMLElement | null> {
  // 1. Попробовать кастомный селектор
  const customSelector = await loadCustomSelector();
  if (customSelector) {
    try {
      const element = document.querySelector(customSelector) as HTMLElement;
      if (element) {
        console.log('✅ Found input using custom selector:', customSelector);
        await saveSuccessfulSelector(customSelector);
        return element;
      }
    } catch (error) {
      console.warn('Invalid custom selector:', customSelector, error);
    }
  }
  
  // 2. Попробовать последний успешный селектор
  const lastSelector = await loadLastSuccessfulSelector();
  if (lastSelector && lastSelector !== customSelector) {
    try {
      const element = document.querySelector(lastSelector) as HTMLElement;
      if (element) {
        console.log('✅ Found input using last successful selector:', lastSelector);
        return element;
      }
    } catch (error) {
      console.warn('Invalid last selector:', lastSelector, error);
    }
  }
  
  // 3. Автопоиск по списку селекторов
  for (const selector of DISCORD_SELECTORS.input) {
    try {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        console.log('✅ Found input using auto selector:', selector);
        await saveSuccessfulSelector(selector);
        return element;
      }
    } catch (error) {
      // Пропустить невалидный селектор
      continue;
    }
  }
  
  return null;
}

/**
 * Найти кнопку Send
 */
function findSendButton(): HTMLElement | null {
  for (const selector of DISCORD_SELECTORS.sendButton) {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      return element;
    }
  }
  return null;
}

/**
 * Отправить промпт в Discord
 */
async function sendPrompt(prompt: string): Promise<void> {
  const input = await findInput();
  if (!input) {
    throw new Error('Input field not found. Make sure you are on Discord chat page.');
  }
  
  const sendButton = findSendButton();
  if (!sendButton) {
    throw new Error('Send button not found.');
  }
  
  // Очистить поле
  if (input instanceof HTMLTextAreaElement) {
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (input instanceof HTMLElement && input.contentEditable === 'true') {
    input.textContent = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  // Ввести промпт
  if (input instanceof HTMLTextAreaElement) {
    input.value = prompt;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (input instanceof HTMLElement && input.contentEditable === 'true') {
    input.textContent = prompt;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  // Небольшая задержка для обновления UI
  await sleep(100);
  
  // Нажать кнопку Send
  (sendButton as HTMLElement).click();
  
  // Подождать подтверждения отправки
  await sleep(500);
}

/**
 * Sleep утилита
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Обнаружить ошибки в Discord
 */
function detectError(): string | null {
  // Проверить наличие сообщений об ошибках
  const errorSelectors = [
    '[class*="error"]',
    '[class*="Error"]',
    '[aria-label*="error"]',
    'div:contains("429")',
    'div:contains("rate limit")'
  ];
  
  for (const selector of errorSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent) {
      const text = element.textContent.toLowerCase();
      if (text.includes('429') || text.includes('rate limit')) {
        return 'rate_limit_exceeded';
      }
      if (text.includes('503') || text.includes('server error')) {
        return 'server_error';
      }
    }
  }
  
  return null;
}

// Слушать сообщения от popup/service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SEND_PROMPT') {
    sendPrompt(message.prompt)
      .then(() => {
        // Проверить на ошибки
        const error = detectError();
        if (error) {
          chrome.runtime.sendMessage({
            type: 'PROMPT_ERROR',
            error: error
          });
        } else {
          chrome.runtime.sendMessage({
            type: 'PROMPT_SENT',
            prompt: message.prompt
          });
        }
      })
      .catch((error) => {
        chrome.runtime.sendMessage({
          type: 'PROMPT_ERROR',
          error: error.message
        });
      });
    
    // Асинхронный ответ
    return true;
  }
  
  // Обработчик тестирования поля ввода
  if (message.type === 'TEST_INPUT') {
    (async () => {
      try {
        const input = await findInput();
        const found = !!input;
        let selector: string | null = null;
        
        if (input) {
          selector = getElementSelector(input);
          // Подсветить элемент
          highlightElement(input);
          
          // Сохранить как успешный
          await saveSuccessfulSelector(selector);
        }
        
        chrome.runtime.sendMessage({
          type: 'TEST_RESULT',
          found,
          selector,
          message: found 
            ? `✅ Поле найдено! Селектор: ${selector}`
            : '❌ Поле не найдено. Убедитесь, что вы на странице Discord чата.'
        });
      } catch (error: any) {
        chrome.runtime.sendMessage({
          type: 'TEST_RESULT',
          found: false,
          selector: null,
          message: `❌ Ошибка: ${error.message}`
        });
      }
    })();
    
    return true; // Асинхронный ответ
  }
  
  return false;
});

// Логирование для отладки
console.log('✅ Midjourney Auto content script loaded');

