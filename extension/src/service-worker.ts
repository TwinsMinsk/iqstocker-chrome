/**
 * Service Worker для Chrome Extension
 * 
 * Обрабатывает фоновые задачи и сообщения
 */

// Проверка доступности Chrome API
if (typeof chrome === 'undefined' || !chrome.runtime) {
  console.error('❌ Chrome extension APIs not available');
} else {
  // Установка расширения
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      console.log('✅ Midjourney Auto extension installed');
      // Приветственное сообщение - пользователь может открыть popup вручную
    } else if (details.reason === 'update') {
      console.log('✅ Midjourney Auto extension updated');
    }
  });

  // Обработка сообщений
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === 'OFFLINE_MODE') {
      // Переслать сообщение в popup если открыт
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(message).catch(() => {
          // Popup не открыт, игнорировать
        });
      }
    }
    
    return false;
  });

  // Периодическая проверка здоровья API
  if (chrome.alarms && chrome.alarms.create) {
    try {
      chrome.alarms.create('healthCheck', { periodInMinutes: 5 });
    } catch (error) {
      console.warn('Failed to create alarm:', error);
    }
  }

  if (chrome.alarms && chrome.alarms.onAlarm) {
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm && alarm.name === 'healthCheck') {
        // TODO: Реализовать health check
        console.log('Health check...');
      }
    });
  }

  // Логирование для отладки
  console.log('✅ Midjourney Auto service worker loaded');
}

