const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, '..', 'extension', 'dist');
const outDir = path.join(__dirname, '..', 'frontend', 'public', 'downloads', 'extension');
const zipPath = path.join(outDir, 'latest.zip');

// Создаем директорию если нет
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Удаляем старый ZIP если есть
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

// Используем PowerShell Compress-Archive (встроенный в Windows)
const distPath = path.join(distDir, '*').replace(/\\/g, '/');
const zipPathEscaped = zipPath.replace(/\\/g, '/');

try {
  execSync(`powershell -Command "Compress-Archive -Path '${distPath}' -DestinationPath '${zipPathEscaped}' -Force"`, {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  
  if (fs.existsSync(zipPath)) {
    const size = fs.statSync(zipPath).size;
    console.log(`✓ ZIP создан: ${zipPath}`);
    console.log(`✓ Размер: ${size} байт`);
  } else {
    console.error('✗ Ошибка: ZIP файл не был создан');
    process.exit(1);
  }
} catch (error) {
  console.error('✗ Ошибка при создании ZIP:', error.message);
  process.exit(1);
}
