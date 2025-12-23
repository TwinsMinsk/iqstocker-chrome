/**
 * Утилита для очистки промптов перед отправкой
 * 
 * Удаляет номера, лишние пробелы, но сохраняет параметры типа --ar 16:9
 */

/**
 * Очистить один промпт
 * 
 * @param rawPrompt - Сырой промпт из текстового поля
 * @returns Очищенный промпт
 */
export function cleanPrompt(rawPrompt: string): string {
  if (!rawPrompt || typeof rawPrompt !== 'string') {
    return '';
  }
  
  let cleaned = rawPrompt.trim();
  
  // Удалить номера в начале: "1. ", "2. ", "10. " и т.д.
  cleaned = cleaned.replace(/^\d+\.\s*/, '');
  
  // Удалить лишние пробелы и переносы строк внутри
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Убедиться, что промпт начинается с /imagine prompt:
  if (!cleaned.startsWith('/imagine')) {
    // Если не начинается с /imagine, попробовать найти его в тексте
    const imagineIndex = cleaned.toLowerCase().indexOf('/imagine');
    if (imagineIndex > 0) {
      // Обрезать всё до /imagine
      cleaned = cleaned.substring(imagineIndex);
    } else {
      // Если /imagine не найден, добавить префикс
      console.warn('Prompt does not contain /imagine, adding prefix:', cleaned.substring(0, 50));
      if (!cleaned.startsWith('/imagine prompt:')) {
        cleaned = '/imagine prompt: ' + cleaned;
      }
    }
  }
  
  return cleaned;
}

/**
 * Очистить массив промптов
 * 
 * @param rawPrompts - Массив сырых промптов
 * @returns Массив очищенных промптов
 */
export function cleanPrompts(rawPrompts: string[]): string[] {
  if (!Array.isArray(rawPrompts)) {
    return [];
  }
  
  return rawPrompts
    .map(prompt => cleanPrompt(prompt))
    .filter(p => p.length > 0);
}

/**
 * Разделить многострочный текст на промпты
 * 
 * @param text - Текст с промптами (могут быть разделены пустыми строками)
 * @returns Массив промптов
 */
export function parsePromptsFromText(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  // Разделить по переносам строк
  const lines = text.split('\n');
  const prompts: string[] = [];
  let currentPrompt = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Если пустая строка и есть накопленный промпт - сохранить его
    if (trimmed === '' && currentPrompt.trim() !== '') {
      prompts.push(currentPrompt.trim());
      currentPrompt = '';
      continue;
    }
    
    // Если строка начинается с номера или /imagine - начать новый промпт
    if (trimmed.match(/^\d+\./) || trimmed.startsWith('/imagine')) {
      if (currentPrompt.trim() !== '') {
        prompts.push(currentPrompt.trim());
      }
      currentPrompt = trimmed;
    } else if (trimmed !== '') {
      // Продолжение текущего промпта
      if (currentPrompt) {
        currentPrompt += ' ' + trimmed;
      } else {
        currentPrompt = trimmed;
      }
    }
  }
  
  // Добавить последний промпт
  if (currentPrompt.trim() !== '') {
    prompts.push(currentPrompt.trim());
  }
  
  return prompts;
}

