const esbuild = require('esbuild');
const fs = require('fs-extra');
const path = require('path');

// Генерируем иконки, если их нет
const iconsDir = path.join(__dirname, '../src/icons');
const icon16Path = path.join(iconsDir, 'icon16.png');
const icon48Path = path.join(iconsDir, 'icon48.png');
const icon128Path = path.join(iconsDir, 'icon128.png');

if (!fs.existsSync(icon16Path) || !fs.existsSync(icon48Path) || !fs.existsSync(icon128Path)) {
  console.log('🎨 Генерация отсутствующих иконок...');
  require('./generate-icons.js');
}

// Читаем версию из manifest.json для автоматической подстановки в код
const manifestPath = path.join(__dirname, '../src/manifest.json');
let extensionVersion = '1.0.0';
try {
  if (fs.existsSync(manifestPath)) {
    // Убираем BOM если есть
    let content = fs.readFileSync(manifestPath, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    const manifest = JSON.parse(content);
    if (manifest.version) {
      extensionVersion = manifest.version;
      console.log(`📦 Extension version: ${extensionVersion}`);
    }
  } else {
    console.warn(`⚠️  Файл manifest.json не найден по пути: ${manifestPath}`);
  }
} catch (error) {
  console.warn(`⚠️  Не удалось прочитать версию из manifest.json: ${error.message}, используется версия по умолчанию`);
}

// Build TypeScript files
// Security note:
// - В production сборке запрещаем кастомный api_base_url (иначе форки легко укажут свой backend).
// - В dev/watch сборке разрешаем override для локальной разработки.
const isWatch = process.argv.includes('--watch');
const allowCustomApiUrl = isWatch ? 'true' : 'false';

esbuild.buildSync({
  entryPoints: {
    popup: 'src/popup.ts',
    content: 'src/content.ts',
    'service-worker': 'src/service-worker.ts'
  },
  outdir: 'dist',
  bundle: true,
  minify: !isWatch,
  target: 'es2020',
  define: {
    'process.env.NODE_ENV': isWatch ? '"development"' : '"production"',
    '__ALLOW_CUSTOM_API_URL__': allowCustomApiUrl,
    '__EXTENSION_VERSION__': JSON.stringify(extensionVersion)
  }
});

// Copy static files
fs.copySync('src/manifest.json', 'dist/manifest.json');
fs.copySync('src/popup.html', 'dist/popup.html');
fs.copySync('src/popup.css', 'dist/popup.css');

// Copy icons if they exist
if (fs.existsSync('src/icons')) {
  fs.copySync('src/icons', 'dist/icons');
}

console.log('✅ Extension built successfully in dist/');

