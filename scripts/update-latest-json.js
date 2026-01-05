const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const zipPath = path.join(__dirname, '..', 'frontend', 'public', 'downloads', 'extension', 'latest.zip');
const jsonPath = path.join(__dirname, '..', 'frontend', 'public', 'downloads', 'extension', 'latest.json');
const manifestPath = path.join(__dirname, '..', 'extension', 'src', 'manifest.json');

if (!fs.existsSync(zipPath)) {
  console.error('✗ ZIP файл не найден:', zipPath);
  process.exit(1);
}

// Читаем версию из manifest.json
let version = '1.0.2';
try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  version = manifest.version || version;
} catch (error) {
  console.warn('⚠ Не удалось прочитать версию из manifest.json');
}

// Вычисляем SHA256 и размер
const stats = fs.statSync(zipPath);
const size = stats.size;
const zipBuffer = fs.readFileSync(zipPath);
const hash = crypto.createHash('sha256').update(zipBuffer).digest('hex');

// Создаем latest.json
const latest = {
  version: version,
  built_at: new Date().toISOString(),
  sha256: hash.toLowerCase(),
  size_bytes: size
};

fs.writeFileSync(jsonPath, JSON.stringify(latest, null, 2) + '\n', 'utf8');

console.log('✓ latest.json обновлен:');
console.log('  Version:', version);
console.log('  Size:', size, 'байт');
console.log('  SHA256:', hash.substring(0, 16) + '...');
