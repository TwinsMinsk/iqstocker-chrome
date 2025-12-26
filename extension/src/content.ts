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
    'div[class*="send"]',
    'div[aria-label*="Send"]',
    'button:has(svg[class*="send"])',
    'button:has(svg[aria-label*="Send"])',
    'div:has(svg[aria-label*="Send"])'
  ]
};

// ID для подсветки элемента
const HIGHLIGHT_ID = 'midjourney-auto-highlight';

// Флаг для предотвращения одновременного выполнения typeText
let isTyping = false;

// Флаг режима выбора элемента
let isElementPickerActive = false;

// Координаты выбранной точки ввода (fallback, если селекторы "плавают")
// Храним как долю экрана, чтобы переживать разные разрешения.
type PickedPoint = { xRatio: number; yRatio: number };

async function loadPickedPoint(): Promise<PickedPoint | null> {
  const r = await chrome.storage.local.get('picked_input_point');
  return r.picked_input_point || null;
}

async function savePickedPoint(p: PickedPoint): Promise<void> {
  await chrome.storage.local.set({ picked_input_point: p });
}

/**
 * Показать уведомление на странице
 */
function showToast(message: string, isError: boolean = false): void {
  const existing = document.getElementById('midjourney-auto-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'midjourney-auto-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed !important;
    top: 20px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    background: ${isError ? '#ef4444' : '#10b981'} !important;
    color: white !important;
    padding: 12px 24px !important;
    border-radius: 8px !important;
    font-family: sans-serif !important;
    font-size: 14px !important;
    font-weight: 500 !important;
    z-index: 2147483647 !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
    transition: opacity 0.3s ease !important;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Подсветить элемент на странице
 */
function highlightFoundElement(element: HTMLElement): void {
  const rect = element.getBoundingClientRect();
  const highlight = document.createElement('div');
  highlight.id = HIGHLIGHT_ID;
  highlight.style.cssText = `
    position: fixed;
    top: ${rect.top - 4}px;
    left: ${rect.left - 4}px;
    width: ${rect.width + 8}px;
    height: ${rect.height + 8}px;
    border: 4px solid #10b981;
    border-radius: 8px;
    background: rgba(16, 185, 129, 0.1);
    pointer-events: none;
    z-index: 2147483646;
    transition: all 0.3s ease;
  `;
  document.body.appendChild(highlight);
  
  // Анимация "пульсации"
  highlight.animate([
    { transform: 'scale(1)', opacity: 0.8 },
    { transform: 'scale(1.05)', opacity: 0.4 },
    { transform: 'scale(1)', opacity: 0.8 }
  ], {
    duration: 1000,
    iterations: 2
  });

  setTimeout(() => highlight.remove(), 3000);
}

/**
 * Поиск поля ввода по сохранённым координатам.
 * Важно: координаты — это fallback. Основной путь — селекторы.
 */
async function findInputByPickedPoint(): Promise<HTMLElement | null> {
  const p = await loadPickedPoint();
  if (!p) return null;

  const x = Math.round(window.innerWidth * p.xRatio);
  const y = Math.round(window.innerHeight * p.yRatio);
  const el = document.elementFromPoint(x, y) as Element | null;
  if (!el) return null;

  // Поднимаемся вверх по DOM, пока не найдём подходящее поле
  let cur: Element | null = el;
  while (cur) {
    if (cur instanceof HTMLTextAreaElement) return cur;
    if (cur instanceof HTMLElement) {
      if (cur.contentEditable === 'true') return cur;
      // Discord часто использует role="textbox"
      if (cur.getAttribute('role') === 'textbox') return cur;
    }
    cur = cur.parentElement;
  }
  return null;
}

/**
 * Загрузить remote selector с сервера (самый приоритетный)
 */
async function loadRemoteSelector(): Promise<string | null> {
  const result = await chrome.storage.local.get('remote_discord_selector');
  return result.remote_discord_selector || null;
}


/**
 * Сохранить успешный селектор
 */
async function saveSuccessfulSelector(selector: string): Promise<void> {
  await chrome.storage.local.set({ last_successful_selector: selector });
}

/**
 * Найти поле ввода Discord
 */
async function findInput(): Promise<HTMLElement | null> {
  // 0. Remote selector (from server, highest priority!)
  const remoteSelector = await loadRemoteSelector();
  if (remoteSelector) {
    try {
      const element = document.querySelector(remoteSelector) as HTMLElement;
      if (element) {
        console.log('✅ Found input using REMOTE selector from server:', remoteSelector);
        await saveSuccessfulSelector(remoteSelector);
        return element;
      }
    } catch (error) {
      console.warn('Invalid remote selector:', remoteSelector, error);
    }
  }
  
  // 1. Try last successful selector
  const result = await chrome.storage.local.get('last_successful_selector');
  if (result.last_successful_selector) {
    try {
      const element = document.querySelector(result.last_successful_selector) as HTMLElement;
      if (element) {
        console.log('✅ Found input using LAST SUCCESSFUL selector:', result.last_successful_selector);
        return element;
      }
    } catch (error) {
      console.warn('Last successful selector no longer works:', error);
    }
  }
  
  // 3. Try all known selectors
  for (const selector of DISCORD_SELECTORS.input) {
    try {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        console.log('✅ Found input using selector:', selector);
        await saveSuccessfulSelector(selector);
        return element;
      }
    } catch (error) {
      // Игнорируем ошибки селекторов
      continue;
    }
  }

  // 3.5 Heuristic: выбрать "лучшего" кандидата (обычно composer внизу)
  try {
    const best = findBestInputCandidate();
    if (best) {
      console.log('✅ Found input using HEURISTIC best-candidate');
      return best;
    }
  } catch (e) {
    console.warn('Heuristic input selection failed:', e);
  }

  // 4. Fallback: попробовать найти по сохранённой точке (координаты)
  try {
    const byPoint = await findInputByPickedPoint();
    if (byPoint) {
      console.log('✅ Found input using PICKED POINT (coordinates fallback)');
      return byPoint;
    }
  } catch (e) {
    console.warn('Picked point fallback failed:', e);
  }
  
  console.warn('❌ Input field not found');
  return null;
}

/**
 * Найти кнопку отправки
 */
function findSendButton(): HTMLElement | null {
  for (const selector of DISCORD_SELECTORS.sendButton) {
    try {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && !element.disabled) {
        return element;
      }
    } catch (error) {
      // Игнорируем ошибки селекторов (например, :has() может не поддерживаться)
      // Отправка всё равно будет выполняться через Enter, поэтому просто игнорируем.
      continue;
    }
  }
  return null;
}

/**
 * Имитация печатания текста (символ за символом)
 * 
 * ВАЖНО: Не отправляет события клавиатуры при вставке символов, чтобы избежать
 * дублирования. Использует только execCommand/insertText + input события.
 */
async function typeText(target: HTMLElement, text: string): Promise<void> {
  // Защита от одновременного выполнения
  if (isTyping) {
    console.warn('⚠️ typeText уже выполняется, пропускаем дублирующий вызов');
    return;
  }
  
  isTyping = true;
  
  try {
    // Вычислить случайную скорость в диапазоне (50-100 символов в секунду)
    const speedMin = 50;
    const speedMax = 100;
    const speed = Math.random() * (speedMax - speedMin) + speedMin; // символов в секунду
    const delayPerChar = 1000 / speed; // миллисекунды на символ
    
    // Очистить поле
    if (target instanceof HTMLTextAreaElement) {
      target.value = '';
      target.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (target instanceof HTMLElement && target.contentEditable === 'true') {
      // Для contentEditable используем более безопасный способ очистки
      target.focus();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.selectNodeContents(target);
        range.deleteContents();
      } else {
        target.textContent = '';
      }
      target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
    }
    
    // Фокус на поле и активация (критично для Slate/Discord)
    try {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(500); // Ждем завершения прокрутки
      
      console.log('[MidjourneyAuto] Активация поля ввода...');
      
      // Имитируем полный цикл клика для Slate/React
      const mouseOptions = { bubbles: true, cancelable: true, view: window };
      target.dispatchEvent(new MouseEvent('mousedown', mouseOptions));
      target.dispatchEvent(new MouseEvent('mouseup', mouseOptions));
      target.dispatchEvent(new MouseEvent('click', mouseOptions));
      
      target.focus();
      
      // Пауза 1 секунда после клика по просьбе пользователя
      await sleep(1000); 
      console.log('[MidjourneyAuto] Поле активировано, начинаем ввод');
    } catch (e) {
      console.warn('Не удалось сфокусироваться на поле:', e);
    }
    
    // Печатать символ за символом
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Добавить небольшую случайную задержку для более естественного набора
      const randomDelay = delayPerChar * (0.8 + Math.random() * 0.4); // ±20% вариация
      
      // Вставить символ БЕЗ событий клавиатуры (чтобы избежать дублирования)
      if (target instanceof HTMLTextAreaElement) {
        // Для textarea просто добавляем символ к значению
        const currentValue = target.value || '';
        target.value = currentValue + char;
        target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: char }));
      } else if (target instanceof HTMLElement && target.contentEditable === 'true') {
        // Для contentEditable используем execCommand - самый надежный способ
        // execCommand автоматически обновляет состояние Discord и не вызывает дублирование
        try {
          target.focus();
          // Убедимся, что курсор в конце
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.collapse(false); // Переместить курсор в конец
            selection.removeAllRanges();
            selection.addRange(range);
          }
          
          // Используем execCommand - он безопасен и не вызывает дублирование
          const success = document.execCommand('insertText', false, char);
          if (!success) {
            // Fallback: прямая вставка через Selection API
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              const r = sel.getRangeAt(0);
              r.deleteContents();
              r.insertNode(document.createTextNode(char));
              r.collapse(false);
              sel.removeAllRanges();
              sel.addRange(r);
            }
            // Отправить только input событие, БЕЗ событий клавиатуры
            target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: char }));
          }
          // execCommand автоматически отправляет input событие, дополнительно не нужно
        } catch (e) {
          console.warn('Ошибка при вставке символа:', e);
          // Последний fallback: прямая запись всего текста до текущей позиции
          const currentText = text.substring(0, i + 1);
          target.textContent = currentText;
          target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
        }
      }
      
      // Проверка: убедиться, что символ действительно вставился
      // (для защиты от случаев, когда Discord игнорирует вставку)
      if (target instanceof HTMLTextAreaElement) {
        const actualValue = target.value || '';
        if (!actualValue.includes(char)) {
          console.warn(`⚠️ Символ '${char}' не вставился в textarea, повторная попытка...`);
          // Повторная попытка
          target.value = actualValue + char;
          target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: char }));
        }
      }
      
      // Задержка перед следующим символом
      await sleep(Math.max(10, randomDelay)); // Минимум 10мс для производительности
    }
    
    // Финальное событие input для уведомления React/Discord
    target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
  } finally {
    // Сбросить флаг в любом случае
    isTyping = false;
  }
}

/**
 * Имитация вставки текста через Paste (как Ctrl+V)
 * Самый надежный способ для Discord/Slate.js
 */
async function insertTextViaPaste(target: HTMLElement, text: string): Promise<boolean> {
  try {
    target.focus();
    
    // Создаем контейнер данных (виртуальный буфер обмена)
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', text);

    // Создаем и отправляем событие вставки
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dataTransfer
    } as any);

    const successful = target.dispatchEvent(pasteEvent);
    
    // Если стандартное событие не сработало, используем execCommand как fallback
    if (!successful || !isFieldNotEmpty(target)) {
      console.log('[MidjourneyAuto] Стандартный paste не сработал, используем execCommand');
      document.execCommand('insertText', false, text);
    }

    return true;
  } catch (e) {
    console.error('[MidjourneyAuto] Ошибка при вставке текста:', e);
    return false;
  }
}

/**
 * Проверка, что поле содержит текст
 */
function isFieldNotEmpty(input: HTMLElement): boolean {
  if (input instanceof HTMLTextAreaElement) return input.value.length > 0;
  return (input.textContent || '').length > 0;
}

/**
 * Отправить промпт в Discord
 */
async function sendPrompt(prompt: string, useTyping: boolean = true): Promise<void> {
  const input = await findInput();
  if (!input) {
    throw new Error('Поле ввода не найдено. Убедитесь, что открыт чат Discord.');
  }
  
  console.log('[MidjourneyAuto] Начало отправки промпта:', prompt.substring(0, 30) + '...');

  // 1. Активация поля (клик + фокус)
  input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await sleep(500); // Ждем завершения прокрутки
  
  console.log('[MidjourneyAuto] Активация поля ввода...');
  const mouseOptions = { bubbles: true, cancelable: true, view: window };
  input.dispatchEvent(new MouseEvent('mousedown', mouseOptions));
  input.dispatchEvent(new MouseEvent('mouseup', mouseOptions));
  input.dispatchEvent(new MouseEvent('click', mouseOptions));
  input.focus();
  
  await sleep(500); // Пауза после клика

  // 2. Вставка текста через Paste (вместо печати по буквам)
  console.log('[MidjourneyAuto] Вставка промпта через Paste...');
  await insertTextViaPaste(input, prompt);

  // 3. ТЕХНОЛОГИЧЕСКАЯ ПАУЗА (1.5 секунды)
  // Это время нужно Discord, чтобы превратить "/imagine" в команду
  console.log('[MidjourneyAuto] Ожидание распознавания команды Discord (1.5с)...');
  await sleep(1500);

  // 4. Отправка через Enter
  console.log('[MidjourneyAuto] Отправка через Enter...');
  dispatchEnter(input);
  
  // 5. Финальная проверка
  await sleep(500);
  if (isFieldCleared(input)) {
    console.log('[MidjourneyAuto] ✅ Промпт успешно отправлен');
  } else {
    console.warn('[MidjourneyAuto] ⚠️ Поле не очистилось, пробуем Enter еще раз');
    dispatchEnter(input);
    await sleep(500);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Попытка "как пользователь" вставить текст в Discord.
 *
 * Важно: Discord часто игнорирует прямое присваивание value/textContent,
 * потому что внутренний state контролируется фреймворком.
 */
async function insertTextRobust(target: HTMLElement, text: string): Promise<boolean> {
  try {
    target.focus();
  } catch {
    // ignore
  }

  // 1) ClipboardEvent paste + DataTransfer
  try {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dt,
    } as any);

    const dispatched = target.dispatchEvent(pasteEvent);
    // dispatched === false если preventDefault() – это нормально, но часто вставка всё равно работает.
    // Проверим, появился ли текст (для textarea) или изменилось содержимое (для contenteditable).
    await sleep(50);

    if (target instanceof HTMLTextAreaElement) {
      if (target.value && target.value.includes(text.slice(0, Math.min(20, text.length)))) return true;
    } else if (target.contentEditable === 'true') {
      if ((target.textContent || '').includes(text.slice(0, Math.min(20, text.length)))) return true;
    }

    // Если paste не сработал, идём дальше
    void dispatched;
  } catch {
    // ignore
  }

  // 2) execCommand insertText (deprecated, но в Discord часто работает лучше всего)
  try {
    // Для contentEditable важно, чтобы фокус был внутри
    target.focus();
    const ok = document.execCommand('insertText', false, text);
    if (ok) return true;
  } catch {
    // ignore
  }

  // 3) Для contentEditable можно попробовать вставку через Selection API
  try {
    if (target.contentEditable === 'true') {
      target.focus();
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        const range = document.createRange();
        range.selectNodeContents(target);
        range.collapse(false);
        selection.addRange(range);
      }
      // Последний шанс: вставить текст узлом
      target.appendChild(document.createTextNode(text));
      target.dispatchEvent(new InputEvent('input', { bubbles: true }));
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}

/**
 * Нажатие Enter на поле ввода.
 */
function dispatchEnter(target: HTMLElement): void {
  const options = {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true,
    view: window
  };

  target.dispatchEvent(new KeyboardEvent('keydown', options));
  target.dispatchEvent(new KeyboardEvent('keypress', options));
  target.dispatchEvent(new KeyboardEvent('keyup', options));
  
  console.log('[MidjourneyAuto] Enter pressed');
}

/**
 * Проверка, очистилось ли поле
 */
function isFieldCleared(input: HTMLElement): boolean {
  if (input instanceof HTMLTextAreaElement) {
    return !input.value || input.value.trim().length === 0;
  }
  return !input.textContent || input.textContent.trim().length === 0;
}

/**
 * Генерировать уникальный селектор для элемента
 */
function generateSelector(element: HTMLElement): string | null {
  // Попробуем использовать id
  if (element.id) {
    return `#${element.id}`;
  }
  
  // Попробуем использовать data-атрибуты
  const dataAttrs = Array.from(element.attributes)
    .filter(attr => attr.name.startsWith('data-'))
    .map(attr => `[${attr.name}="${attr.value}"]`)
    .join('');
  if (dataAttrs) {
    const tagName = element.tagName.toLowerCase();
    return `${tagName}${dataAttrs}`;
  }
  
  // Попробуем использовать role и другие атрибуты
  if (element.getAttribute('role')) {
    const role = element.getAttribute('role');
    const tagName = element.tagName.toLowerCase();
    return `${tagName}[role="${role}"]`;
  }
  
  // Используем классы (берем первый значимый класс)
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.split(/\s+/).filter(c => c && !c.startsWith('_'));
    if (classes.length > 0) {
      const tagName = element.tagName.toLowerCase();
      return `${tagName}.${classes[0]}`;
    }
  }
  
  // Fallback: используем путь через родителя
  const path: string[] = [];
  let current: HTMLElement | null = element;
  while (current && current !== document.body && path.length < 5) {
    const tagName = current.tagName.toLowerCase();
    const index = Array.from(current.parentElement?.children || []).indexOf(current);
    path.unshift(`${tagName}:nth-child(${index + 1})`);
    current = current.parentElement;
  }
  if (path.length > 0) {
    return path.join(' > ');
  }
  
  return null;
}

/**
 * Более стабильный селектор именно для поля ввода Discord.
 * Цель: не завязываться на хэши классов, которые часто меняются.
 */
function buildStableDiscordInputSelector(el: HTMLElement): string | null {
  // textarea вариант (как на вашем скрине в DevTools)
  if (el instanceof HTMLTextAreaElement) {
    const parts: string[] = ['textarea'];
    if (el.getAttribute('aria-multiline') === 'true') parts.push('[aria-multiline="true"]');
    const ac = el.getAttribute('autocomplete');
    if (ac) parts.push(`[autocomplete="${ac}"]`);
    const ah = el.getAttribute('aria-haspopup');
    if (ah) parts.push(`[aria-haspopup="${ah}"]`);
    // Не добавляем placeholder/aria-label — они зависят от чата/языка.
    return parts.join('');
  }

  // slate/contenteditable вариант
  if (el.getAttribute('role') === 'textbox') {
    const parts: string[] = ['div[role="textbox"]'];
    if (el.getAttribute('data-slate-editor') === 'true') parts.push('[data-slate-editor="true"]');
    if (el.contentEditable === 'true') parts.push('[contenteditable="true"]');
    return parts.join('');
  }

  if (el.contentEditable === 'true') {
    return 'div[contenteditable="true"][role="textbox"]';
  }

  return null;
}

function isVisibleElement(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return false;
  if (rect.bottom < 0 || rect.top > window.innerHeight) return false;
  if (rect.right < 0 || rect.left > window.innerWidth) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  return true;
}

/**
 * Найти "лучшее" поле ввода по эвристикам (если селекторы не помогли).
 * Это снижает шанс выбрать поисковую строку/прочие textbox'ы.
 */
function findBestInputCandidate(): HTMLElement | null {
  const candidates: HTMLElement[] = [];

  document
    .querySelectorAll(
      [
        'textarea[aria-multiline="true"]',
        'textarea',
        'div[role="textbox"][data-slate-editor="true"]',
        'div[role="textbox"][contenteditable="true"]',
        'div[contenteditable="true"][role="textbox"]',
      ].join(',')
    )
    .forEach((n) => {
      if (n instanceof HTMLElement) candidates.push(n);
    });

  const scored = candidates
    .filter((el) => isVisibleElement(el))
    .map((el) => {
      const r = el.getBoundingClientRect();
      // Чем ближе к низу окна — тем выше шанс, что это composer.
      const bottomCloseness = 1 - Math.min(1, Math.abs(window.innerHeight - r.bottom) / window.innerHeight);
      // Чем шире — тем вероятнее это основное поле ввода.
      const widthScore = Math.min(1, r.width / window.innerWidth);
      // Небольшой бонус для role=textbox / aria-multiline
      const roleBonus = el.getAttribute('role') === 'textbox' ? 0.15 : 0;
      const ariaMultiBonus =
        el instanceof HTMLTextAreaElement && el.getAttribute('aria-multiline') === 'true' ? 0.15 : 0;
      const score = bottomCloseness * 0.55 + widthScore * 0.3 + roleBonus + ariaMultiBonus;
      return { el, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.el || null;
}

/**
 * Активировать режим выбора элемента
 */
function activateElementPicker(): void {
  if (isElementPickerActive) {
    return;
  }
  
  isElementPickerActive = true;
  
  // Добавить стили для указателя
  const style = document.createElement('style');
  style.id = 'element-picker-style';
  style.textContent = `
    /* Overlay нужен, чтобы гарантированно получать mousemove/click
       даже если сайт (Discord) глушит события на document/window. */
    .element-picker-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2147483647; /* максимально поверх */
      cursor: crosshair !important;
      background: rgba(0, 0, 0, 0.03); /* почти незаметно */
      pointer-events: auto;
    }
    .element-picker-highlight {
      outline: 3px solid #00ff00 !important;
      outline-offset: 2px !important;
      background: rgba(0, 255, 0, 0.1) !important;
      position: relative;
      z-index: 2147483646 !important;
    }
    .element-picker-tooltip {
      position: fixed;
      background: #000;
      color: #fff;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 2147483647;
      pointer-events: none;
      font-family: monospace;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
  `;
  document.head.appendChild(style);

  // Overlay
  const overlay = document.createElement('div');
  overlay.id = 'element-picker-overlay';
  overlay.className = 'element-picker-overlay';
  document.body.appendChild(overlay);

  // Создать tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'element-picker-tooltip';
  tooltip.id = 'element-picker-tooltip';
  tooltip.style.display = 'none';
  document.body.appendChild(tooltip);
  
  let highlightedElement: HTMLElement | null = null;
  const prevStyle = new WeakMap<HTMLElement, { outline: string; outlineOffset: string; background: string }>();

  const applyHighlight = (el: HTMLElement) => {
    if (!prevStyle.has(el)) {
      prevStyle.set(el, {
        outline: el.style.outline || '',
        outlineOffset: el.style.outlineOffset || '',
        background: el.style.background || '',
      });
    }
    // Прямые inline-стили почти невозможно "перебить" Discord'ом.
    el.style.outline = '3px solid #00ff00';
    el.style.outlineOffset = '2px';
    // background может портить вид, поэтому делаем очень слабый
    el.style.background = 'rgba(0, 255, 0, 0.08)';
  };

  const clearHighlight = (el: HTMLElement) => {
    const p = prevStyle.get(el);
    if (p) {
      el.style.outline = p.outline;
      el.style.outlineOffset = p.outlineOffset;
      el.style.background = p.background;
    } else {
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.background = '';
    }
  };

  const pickUnderlyingElement = (clientX: number, clientY: number): HTMLElement | null => {
    // Важно: overlay находится поверх всего и будет возвращаться elementFromPoint.
    // Поэтому на мгновение отключаем pointer-events у overlay.
    const prev = overlay.style.pointerEvents;
    overlay.style.pointerEvents = 'none';
    const el = document.elementFromPoint(clientX, clientY) as Element | null;
    overlay.style.pointerEvents = prev || 'auto';
    if (!el) return null;

    // Если это не HTMLElement (например SVG), поднимемся до ближайшего HTMLElement.
    if (el instanceof HTMLElement) return el;
    return (el.parentElement as HTMLElement | null) || null;
  };

  // Обработчик движения/указателя
  const handlePointerMove = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const target = pickUnderlyingElement(e.clientX, e.clientY);
    if (!target) return;

    // Убрать подсветку с предыдущего элемента
    if (highlightedElement && highlightedElement !== target) {
      clearHighlight(highlightedElement);
    }

    highlightedElement = target;
    applyHighlight(target);

    const selector = generateSelector(target);
    tooltip.textContent = selector || target.tagName.toLowerCase();
    tooltip.style.display = 'block';
    tooltip.style.left = `${e.pageX + 10}px`;
    tooltip.style.top = `${e.pageY + 10}px`;
  };
  
  // Обработчик выбора
  const handlePointerDown = async (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const target = pickUnderlyingElement(e.clientX, e.clientY);
    if (!target) return;
    
    // Деактивировать picker
    deactivateElementPicker();
    
    // Стабильный селектор для Discord input (предпочтительно)
    const stableSelector = buildStableDiscordInputSelector(target);
    const selector = stableSelector || generateSelector(target);
    if (!selector) {
      showToast('❌ Ошибка: не удалось создать селектор', true);
      chrome.runtime.sendMessage({
        type: 'TEST_RESULT',
        found: false,
        message: '❌ Не удалось создать селектор для выбранного элемента'
      });
      return;
    }
    
    // Сохранить селектор + координаты (fallback)
    await saveSuccessfulSelector(selector);
    await savePickedPoint({
      xRatio: Math.min(1, Math.max(0, e.clientX / Math.max(1, window.innerWidth))),
      yRatio: Math.min(1, Math.max(0, e.clientY / Math.max(1, window.innerHeight))),
    });
    
    // Подсветить выбранный элемент и показать уведомление
    highlightFoundElement(target);
    showToast(`✅ Селектор сохранен: ${selector}`);
    
    // Отправить результат
    chrome.runtime.sendMessage({
      type: 'TEST_RESULT',
      found: true,
      message: `✅ Элемент выбран! Селектор: ${selector}`,
      selector: selector
    });
  };
  
  // Обработчик ESC для отмены
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      deactivateElementPicker();
      chrome.runtime.sendMessage({
        type: 'TEST_RESULT',
        found: false,
        message: '❌ Выбор элемента отменен'
      });
    }
  };

  // Вешаем обработчики на overlay (target = overlay), чтобы Discord не мог их "заглушить"
  // Используем Pointer Events — в Discord они работают стабильнее.
  overlay.addEventListener('pointermove', handlePointerMove, { capture: true });
  overlay.addEventListener('pointerdown', handlePointerDown, { capture: true });
  document.addEventListener('keydown', handleKeyDown, true);

  // Сохранить обработчики для последующего удаления
  (overlay as any).__pickerHandlers = { handlePointerMove, handlePointerDown, handleKeyDown };
}

/**
 * Деактивировать режим выбора элемента
 */
function deactivateElementPicker(): void {
  if (!isElementPickerActive) {
    return;
  }
  
  isElementPickerActive = false;
  
  const overlay = document.getElementById('element-picker-overlay');
  if (overlay) {
    const handlers = (overlay as any).__pickerHandlers;
    if (handlers) {
      overlay.removeEventListener('pointermove', handlers.handlePointerMove, true as any);
      overlay.removeEventListener('pointerdown', handlers.handlePointerDown, true as any);
      document.removeEventListener('keydown', handlers.handleKeyDown, true);
    }
    overlay.remove();
  }
  
  // Удалить tooltip
  const tooltip = document.getElementById('element-picker-tooltip');
  if (tooltip) {
    tooltip.remove();
  }
  
  // Удалить стили
  const style = document.getElementById('element-picker-style');
  if (style) {
    style.remove();
  }
  
  // Убрать подсветку со всех элементов
  document.querySelectorAll('.element-picker-highlight').forEach(el => {
    el.classList.remove('element-picker-highlight');
  });
}

/**
 * Обнаружить ошибку в Discord (rate limit, server error и т.д.)
 */
function detectError(): string | null {
  // Безопасные селекторы для поиска ошибок
  const safeSelectors = [
    '[role="alert"]',
    '[class*="error"]',
    '[class*="Error"]',
    '[class*="warning"]',
    '[class*="Warning"]',
    '[class*="rate-limit"]',
    '[class*="rateLimit"]',
  ];

  const needles = [
    { key: 'rate_limit_exceeded', words: ['429', 'rate limit', 'слишком много запросов'] },
    { key: 'server_error', words: ['503', 'server error', 'ошибка сервера'] },
  ] as const;

  const candidates: Element[] = [];
  for (const selector of safeSelectors) {
    try {
      document.querySelectorAll(selector).forEach((el) => candidates.push(el));
    } catch {
      // игнорируем невалидные/неподдерживаемые селекторы
    }
  }

  // Если ничего не нашли по селекторам, делать полный обход DOM дорого.
  // Поэтому ограничимся небольшим набором кандидатов.
  for (const el of candidates) {
    const text = (el.textContent || '').toLowerCase();
    if (!text) continue;
    for (const n of needles) {
      if (n.words.some((w) => text.includes(w))) return n.key;
    }
  }

  return null;
}

// Слушать сообщения от popup/service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // PING нужен, чтобы background мог проверить что content script жив
  if (message?.type === 'PING') {
    try {
      sendResponse({ ok: true });
    } catch {
      // ignore
    }
    return true;
  }

  // TEST_INPUT — проверка что поле ввода найдено или активация picker
  if (message?.type === 'TEST_INPUT') {
    // Обрабатываем асинхронно, но не используем sendResponse
    // Вместо этого отправляем ответ через chrome.runtime.sendMessage
    // Не возвращаем true, так как мы не используем sendResponse
    (async () => {
      try {
        // Если запрошен режим выбора элемента (Ручной-поиск)
        if (message.picker === true) {
          deactivateElementPicker();
          activateElementPicker();
          showToast('🎯 Выберите поле ввода для Midjourney');
          return;
        }
        
        // Обычная проверка (Авто-поиск) - найти поле автоматически
        const input = await findInput();
        if (input) {
          highlightFoundElement(input);
          
          const selector = buildStableDiscordInputSelector(input) || generateSelector(input);
          showToast('✅ Поле ввода успешно найдено!');
          
          chrome.runtime.sendMessage({
            type: 'TEST_RESULT',
            found: true,
            selector: selector,
            message: '✅ Поле найдено автоматически!'
          }).catch(() => {
            // Игнорируем ошибки если popup закрыт
          });
        } else {
          showToast('❌ Авто-поиск не удался. Используйте ручной выбор.', true);
          chrome.runtime.sendMessage({
            type: 'TEST_RESULT',
            found: false,
            message: '❌ Поле не найдено автоматически.'
          }).catch(() => {
            // Игнорируем ошибки если popup закрыт
          });
        }
      } catch (e: any) {
        showToast('❌ Ошибка при поиске', true);
        chrome.runtime.sendMessage({
          type: 'TEST_RESULT',
          found: false,
          error: e?.message || 'Unknown error'
        }).catch(() => {
          // Игнорируем ошибки если popup закрыт
        });
      }
    })();
    // Не возвращаем значение - ответ отправляется через chrome.runtime.sendMessage
    // Это предотвращает ошибку "listener indicated an asynchronous response"
    return;
  }
  
  // DEACTIVATE_PICKER — деактивация picker
  if (message?.type === 'DEACTIVATE_PICKER') {
    deactivateElementPicker();
    return true;
  }

  // TYPE_PROMPT — основной путь: background управляет очередью и шлёт промпты сюда
  if (message?.type === 'TYPE_PROMPT') {
    console.log('[MidjourneyAuto] Получено сообщение TYPE_PROMPT:', message.text.substring(0, 30));
    
    // Сразу отвечаем, чтобы не закрылся канал (защита от "message channel closed")
    sendResponse({ ok: true, status: 'started' });

    (async () => {
      try {
        // Дополнительная защита от одновременных вызовов
        if (isTyping) {
          console.warn('⚠️ TYPE_PROMPT: уже идет процесс печатания, ожидание завершения...');
          let waitCount = 0;
          while (isTyping && waitCount < 300) {
            await sleep(100);
            waitCount++;
          }
        }
        
        const useTyping = message.use_typing !== false; // По умолчанию true
        
        await sendPrompt(message.text, useTyping);
        
        // Отправляем отдельное сообщение о завершении
        // ВАЖНО: Включаем индекс промпта для защиты от дублирования
        chrome.runtime.sendMessage({ 
          type: 'PROMPT_COMPLETED', 
          ok: true, 
          prompt: message.text,
          prompt_index: message.prompt_index // Добавляем индекс для идентификации
        });
      } catch (e: any) {
        console.error('[MidjourneyAuto] Ошибка при вводе промпта:', e);
        chrome.runtime.sendMessage({ 
          type: 'PROMPT_COMPLETED', 
          ok: false, 
          error: e?.message || 'Unknown error',
          prompt: message.text,
          prompt_index: message.prompt_index // Добавляем индекс для идентификации
        });
      }
    })();
    return false; // Мы уже ответили через sendResponse
  }

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
          error: error.message || 'Unknown error'
        });
      });
    return true;
  }


  return false;
});
