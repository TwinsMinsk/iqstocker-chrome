/**
 * Скрипт для генерации иконок расширения на основе логотипа
 * Требует установки: npm install canvas
 * 
 * Запуск: node generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Проверяем наличие canvas
let Canvas;
try {
  Canvas = require('canvas');
} catch (e) {
  console.error('❌ Ошибка: требуется установить canvas');
  console.error('   Установите: npm install canvas');
  console.error('\n   Или используйте generate-icons.html в браузере');
  process.exit(1);
}

const sizes = [16, 48, 128];
const outputDir = path.join(__dirname, 'src', 'icons');

// Создаем директорию если её нет
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function createIcon(size) {
  const canvas = Canvas.createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Фон - фиолетовый (indigo-600: #4f46e5)
  const cornerRadius = size * 0.2; // 20% для rounded-xl эффекта
  ctx.fillStyle = '#4f46e5';
  
  // Рисуем закругленный прямоугольник
  ctx.beginPath();
  ctx.moveTo(cornerRadius, 0);
  ctx.lineTo(size - cornerRadius, 0);
  ctx.quadraticCurveTo(size, 0, size, cornerRadius);
  ctx.lineTo(size, size - cornerRadius);
  ctx.quadraticCurveTo(size, size, size - cornerRadius, size);
  ctx.lineTo(cornerRadius, size);
  ctx.quadraticCurveTo(0, size, 0, size - cornerRadius);
  ctx.lineTo(0, cornerRadius);
  ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
  ctx.closePath();
  ctx.fill();
  
  // Текст "IQ"
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.floor(size * 0.5)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('IQ', size / 2, size / 2);
  
  // Сохраняем
  const buffer = canvas.toBuffer('image/png');
  const filename = path.join(outputDir, `icon${size}.png`);
  fs.writeFileSync(filename, buffer);
  
  console.log(`✅ Создана иконка: icon${size}.png`);
}

console.log('🎨 Генерация иконок расширения...\n');

sizes.forEach(size => {
  createIcon(size);
});

console.log('\n✨ Все иконки успешно созданы!');
console.log(`📁 Расположение: ${outputDir}`);

