const fs = require('fs-extra');
const path = require('path');

// Простая генерация PNG иконок используя минимальный PNG формат
// Создаем простые цветные квадратные иконки с градиентом

function createPNG(width, height, color = [70, 130, 180]) {
  // Минимальный PNG заголовок + IDAT chunk с данными
  // Используем простой подход - создаем PNG с одним цветом
  
  const pixels = width * height;
  const rowSize = width * 3 + 1; // RGB + filter byte
  const dataSize = height * rowSize;
  
  // Создаем простую PNG структуру
  // PNG signature
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  
  const ihdrCRC = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
  const ihdrChunk = Buffer.concat([
    Buffer.from([0, 0, 0, 13]), // length
    Buffer.from('IHDR'),
    ihdrData,
    Buffer.from([
      (ihdrCRC >>> 24) & 0xFF,
      (ihdrCRC >>> 16) & 0xFF,
      (ihdrCRC >>> 8) & 0xFF,
      ihdrCRC & 0xFF
    ])
  ]);
  
  // Создаем IDAT данные (простой градиент)
  const idatBuffer = Buffer.alloc(dataSize);
  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    idatBuffer[rowStart] = 0; // filter byte
    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * 3;
      // Простой градиент от темного к светлому
      const factor = (x + y) / (width + height);
      idatBuffer[pixelStart] = Math.floor(color[0] * (0.5 + factor * 0.5));     // R
      idatBuffer[pixelStart + 1] = Math.floor(color[1] * (0.5 + factor * 0.5)); // G
      idatBuffer[pixelStart + 2] = Math.floor(color[2] * (0.5 + factor * 0.5)); // B
    }
  }
  
  // Сжимаем данные (простой deflate)
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(idatBuffer);
  
  const idatCRC = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  const idatChunk = Buffer.concat([
    Buffer.from([
      (compressed.length >>> 24) & 0xFF,
      (compressed.length >>> 16) & 0xFF,
      (compressed.length >>> 8) & 0xFF,
      compressed.length & 0xFF
    ]),
    Buffer.from('IDAT'),
    compressed,
    Buffer.from([
      (idatCRC >>> 24) & 0xFF,
      (idatCRC >>> 16) & 0xFF,
      (idatCRC >>> 8) & 0xFF,
      idatCRC & 0xFF
    ])
  ]);
  
  // IEND chunk
  const iendCRC = crc32(Buffer.from('IEND'));
  const iendChunk = Buffer.concat([
    Buffer.from([0, 0, 0, 0]), // length
    Buffer.from('IEND'),
    Buffer.from([
      (iendCRC >>> 24) & 0xFF,
      (iendCRC >>> 16) & 0xFF,
      (iendCRC >>> 8) & 0xFF,
      iendCRC & 0xFF
    ])
  ]);
  
  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

// Простая CRC32 функция
function crc32(buffer) {
  const table = [];
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (crc >>> 1) ^ 0xEDB88320 : crc >>> 1;
    }
    table[i] = crc;
  }
  
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buffer.length; i++) {
    crc = table[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Генерируем иконки
const iconsDir = path.join(__dirname, '../src/icons');
fs.ensureDirSync(iconsDir);

// Цвет для иконок (Steel Blue)
const iconColor = [70, 130, 180];

console.log('🎨 Генерация иконок расширения...');

// Генерируем иконки разных размеров
const sizes = [16, 48, 128];
sizes.forEach(size => {
  const iconData = createPNG(size, size, iconColor);
  const iconPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(iconPath, iconData);
  console.log(`✅ Создана иконка: icon${size}.png (${size}x${size}px)`);
});

console.log('✨ Все иконки успешно созданы!');

