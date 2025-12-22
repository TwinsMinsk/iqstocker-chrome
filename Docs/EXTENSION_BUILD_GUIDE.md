# 📦 CHROME EXTENSION BUILD & DISTRIBUTION GUIDE
## Компиляция и распространение расширения

**Для:** Midjourney Auto Chrome Extension  
**Дата:** December 22, 2025  
**Метод:** .crx файл с PEM подписью (самостоятельное распространение)  

---

## 📂 СТРУКТУРА ПРОЕКТА

```
extension/
├── src/
│   ├── manifest.json          # Chrome MV3 manifest
│   ├── popup.html             # Popup UI
│   ├── popup.css              # Popup styles
│   ├── popup.ts               # Popup logic
│   ├── content.ts             # Content script (Discord)
│   ├── service-worker.ts      # Background service worker
│   ├── utils/
│   │   ├── api.ts             # API client
│   │   ├── dom-helpers.ts     # Discord DOM utilities
│   │   ├── logger.ts          # IndexedDB logging
│   │   └── storage.ts         # chrome.storage wrapper
│   ├── types/
│   │   └── index.ts           # TypeScript types
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── dist/                      # Compiled output (generated)
├── releases/                  # .crx releases (generated)
├── build/
│   ├── build.js               # esbuild compilation
│   ├── package-crx.sh         # Linux/Mac packaging
│   └── package-crx.bat        # Windows packaging
├── private-key.pem            # ⚠️ НЕ КОММИТИТЬ! Extension signing key
├── package.json
├── tsconfig.json
└── .gitignore

⚠️ ВАЖНО: private-key.pem НИКОГДА не должен попасть в Git!
```

---

## 🔧 ШАГИ СБОРКИ

### Шаг 1: Development Build (для разработки)

```bash
cd extension
npm install
npm run build
```

**build.js:**
```javascript
const esbuild = require('esbuild');
const fs = require('fs-extra');

// Build TypeScript files
esbuild.buildSync({
  entryPoints: {
    popup: 'src/popup.ts',
    content: 'src/content.ts',
    'service-worker': 'src/service-worker.ts'
  },
  outdir: 'dist',
  bundle: true,
  minify: true,
  target: 'es2020',
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});

// Copy static files
fs.copySync('src/manifest.json', 'dist/manifest.json');
fs.copySync('src/popup.html', 'dist/popup.html');
fs.copySync('src/popup.css', 'dist/popup.css');
fs.copySync('src/icons', 'dist/icons');

console.log('✅ Build completed: dist/');
```

**package.json:**
```json
{
  "name": "midjourney-auto-extension",
  "version": "1.0.0",
  "scripts": {
    "build": "node build/build.js",
    "watch": "node build/build.js --watch",
    "package": "npm run build && ./build/package-crx.sh",
    "package:win": "npm run build && .\\build\\package-crx.bat"
  },
  "devDependencies": {
    "esbuild": "^0.19.0",
    "fs-extra": "^11.1.0",
    "typescript": "^5.3.0"
  }
}
```

### Шаг 2: Тестирование в Chrome (Developer Mode)

1. Откройте Chrome → `chrome://extensions/`
2. Включите "Developer mode" (переключатель вверху справа)
3. Нажмите "Load unpacked"
4. Выберите папку `extension/dist/`
5. Расширение установлено и готово к тестированию

**Во время разработки используйте только этот метод!**

---

## 🔐 PRODUCTION PACKAGING (.crx файл)

**⚠️ ДЕЛАЙТЕ ТОЛЬКО КОГДА ГОТОВЫ К РЕЛИЗУ!**

### Шаг 1: Генерация PEM ключа (первый раз)

```bash
cd extension

# Linux/Mac
openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -out private-key.pem

# Windows (PowerShell)
openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -out private-key.pem
```

**⚠️ КРИТИЧЕСКИ ВАЖНО:**
1. Сохраните `private-key.pem` в **безопасном месте** (не только на диске!)
2. Без этого ключа вы **НИКОГДА** не сможете обновить расширение
3. Extension ID навсегда привязан к этому ключу
4. Если потеряете ключ → придётся создавать новое расширение с новым ID

**Добавьте в .gitignore:**
```
# Extension security
private-key.pem
*.pem
releases/*.crx
```

### Шаг 2: Вычисление Extension ID

Extension ID генерируется из public key:

```bash
# Linux/Mac
openssl rsa -in private-key.pem -pubout -outform DER | \
  openssl base64 -A | \
  head -c 32 | \
  tr '/+' '_-'

# Результат (пример): abcdefghijklmnopqrstuvwxyz123456
```

**Сохраните Extension ID** — он понадобится для:
- Update manifest URL
- Аналитики установок
- Поддержки пользователей

### Шаг 3: Packaging (создание .crx)

#### Linux/Mac:

```bash
npm run package
```

**build/package-crx.sh:**
```bash
#!/bin/bash
set -e

EXTENSION_DIR="./dist"
OUTPUT_DIR="./releases"
PRIVATE_KEY="./private-key.pem"
VERSION=$(grep '"version"' src/manifest.json | cut -d'"' -f4)
CRX_FILE="$OUTPUT_DIR/midjourney-auto-v$VERSION.crx"

# Проверки
if [ ! -d "$EXTENSION_DIR" ]; then
  echo "❌ Error: dist/ не найдена. Запустите npm run build"
  exit 1
fi

if [ ! -f "$PRIVATE_KEY" ]; then
  echo "❌ Error: private-key.pem не найден!"
  exit 1
fi

# Create output directory
mkdir -p $OUTPUT_DIR

# Package extension
echo "📦 Packaging extension v$VERSION..."

# Method 1: Using Chrome CLI (если установлен Chrome)
if command -v google-chrome &> /dev/null; then
  google-chrome \
    --pack-extension=$EXTENSION_DIR \
    --pack-extension-key=$PRIVATE_KEY \
    --no-message-box
  
  mv "${EXTENSION_DIR}.crx" "$CRX_FILE"
else
  echo "⚠️  Chrome CLI not found, using crx tool..."
  # Method 2: Using crx npm package
  npx crx pack $EXTENSION_DIR -p $PRIVATE_KEY -o $CRX_FILE
fi

echo "✅ Extension packaged: $CRX_FILE"
echo "📋 Extension ID: $(openssl rsa -in $PRIVATE_KEY -pubout -outform DER | openssl base64 -A | head -c 32 | tr '/+' '_-')"
echo "📦 Size: $(du -h $CRX_FILE | cut -f1)"
```

#### Windows:

```batch
npm run package:win
```

**build/package-crx.bat:**
```batch
@echo off
setlocal enabledelayedexpansion

SET EXTENSION_DIR=.\dist
SET OUTPUT_DIR=.\releases
SET PRIVATE_KEY=.\private-key.pem

REM Get version from manifest
for /f "tokens=2 delims=:, " %%a in ('findstr "version" src\manifest.json') do set VERSION=%%~a
SET CRX_FILE=%OUTPUT_DIR%\midjourney-auto-v%VERSION%.crx

REM Checks
if not exist %EXTENSION_DIR% (
  echo ❌ Error: dist\ не найдена. Запустите npm run build
  exit /b 1
)

if not exist %PRIVATE_KEY% (
  echo ❌ Error: private-key.pem не найден!
  exit /b 1
)

REM Create output directory
if not exist %OUTPUT_DIR% mkdir %OUTPUT_DIR%

echo 📦 Packaging extension v%VERSION%...

REM Package using Chrome
"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --pack-extension=%EXTENSION_DIR% ^
  --pack-extension-key=%PRIVATE_KEY% ^
  --no-message-box

move "%EXTENSION_DIR%.crx" "%CRX_FILE%"

echo ✅ Extension packaged: %CRX_FILE%
```

---

## 📤 РАСПРОСТРАНЕНИЕ

### Метод 1: Прямое скачивание с сайта

**На dashboard пользователя:**

```html
<!-- Dashboard page -->
<div class="download-section">
  <h3>Скачать расширение</h3>
  
  <!-- .crx файл (рекомендуемый) -->
  <a href="/downloads/midjourney-auto-v1.0.0.crx" 
     class="btn btn-primary"
     download>
    📦 Скачать .crx (рекомендуется)
  </a>
  
  <!-- ZIP файл (альтернатива) -->
  <a href="/downloads/midjourney-auto-v1.0.0.zip" 
     class="btn btn-secondary"
     download>
    📁 Скачать .zip (альтернатива)
  </a>
  
  <!-- Инструкция -->
  <a href="/docs/installation" 
     target="_blank">
    📖 Как установить?
  </a>
</div>
```

### Метод 2: Прямая ссылка (update_url)

**В manifest.json добавьте:**
```json
{
  "update_url": "https://yourdomain.com/extension/updates.xml"
}
```

**Создайте updates.xml:**
```xml
<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='YOUR_EXTENSION_ID'>
    <updatecheck 
      codebase='https://yourdomain.com/downloads/midjourney-auto-latest.crx' 
      version='1.0.0' />
  </app>
</gupdate>
```

**Backend endpoint (FastAPI):**
```python
@app.get("/extension/updates.xml")
async def extension_updates():
    """Chrome extension update manifest"""
    latest_version = "1.0.0"
    extension_id = "YOUR_EXTENSION_ID"
    
    xml = f'''<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='{extension_id}'>
    <updatecheck 
      codebase='https://yourdomain.com/downloads/midjourney-auto-v{latest_version}.crx' 
      version='{latest_version}' />
  </app>
</gupdate>'''
    
    return Response(content=xml, media_type="application/xml")
```

---

## 🛠️ УСТАНОВКА ПОЛЬЗОВАТЕЛЯМИ

### Инструкция для пользователей:

#### Метод 1: Установка .crx файла

1. Скачайте `midjourney-auto.crx` из личного кабинета
2. Откройте Chrome → `chrome://extensions/`
3. Включите "Developer mode" (переключатель вверху справа)
4. **Перетащите** файл `.crx` в окно Chrome
5. Chrome покажет предупреждение → нажмите **"Add extension"**
6. Расширение установлено! Кликните на иконку в toolbar

**⚠️ Предупреждение Chrome:**
Chrome покажет: "Extensions running in developer mode"
Это нормально, т.к. расширение не из Web Store.

#### Метод 2: Установка из ZIP (альтернатива)

1. Скачайте `midjourney-auto.zip`
2. Распакуйте в любую папку (например, `C:\Extensions\midjourney-auto\`)
3. Откройте Chrome → `chrome://extensions/`
4. Включите "Developer mode"
5. Нажмите "Load unpacked"
6. Выберите распакованную папку
7. Расширение установлено!

---

## 🔄 ОБНОВЛЕНИЯ

### Выпуск нового обновления:

1. **Обновите version в manifest.json:**
   ```json
   {
     "version": "1.0.1"
   }
   ```

2. **Соберите новую версию:**
   ```bash
   npm run build
   npm run package  # или package:win
   ```

3. **Залейте .crx на сервер:**
   ```bash
   scp releases/midjourney-auto-v1.0.1.crx server:/var/www/downloads/
   ```

4. **Обновите updates.xml** (если используете auto-update)

5. **Уведомите пользователей** (email или в dashboard)

**Пользователи с auto-update:**
- Chrome автоматически проверит обновления (каждые 5 часов)
- Скачает новую версию
- Установит при перезапуске браузера

**Пользователи без auto-update:**
- Увидят уведомление в dashboard
- Скачают новую версию вручную
- Переустановят расширение

---

## ⚠️ БЕЗОПАСНОСТЬ

### Критически важные правила:

1. **PEM ключ:**
   - ✅ Храните в защищённом месте (cloud backup + offline backup)
   - ❌ НИКОГДА не коммитьте в Git
   - ❌ НИКОГДА не отправляйте по email/Telegram
   - ✅ Используйте password manager для хранения

2. **Extension ID:**
   - Запишите в документации проекта
   - Понадобится для support tickets
   - Нельзя изменить без создания нового расширения

3. **.crx файл:**
   - ✅ Можно публиковать на сайте
   - ✅ Можно отправлять пользователям
   - Подпись проверяется Chrome автоматически

4. **Обновление кода:**
   - Всегда используйте ОДИН И ТОТ ЖЕ PEM ключ
   - Иначе Chrome посчитает это другим расширением

---

## 📊 МОНИТОРИНГ

### Отслеживание установок:

**Backend endpoint:**
```python
@app.post("/extensions/installed")
async def extension_installed(
    extension_id: str,
    version: str,
    user_agent: str = Header(None)
):
    """Track extension installations"""
    await db.extensions_installs.create({
        "extension_id": extension_id,
        "version": version,
        "user_agent": user_agent,
        "installed_at": datetime.utcnow()
    })
    return {"status": "ok"}
```

**В service-worker.ts:**
```typescript
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First install
    fetch('https://api.yourdomain.com/api/v1/extensions/installed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        extension_id: chrome.runtime.id,
        version: chrome.runtime.getManifest().version
      })
    });
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('Updated from', details.previousVersion);
  }
});
```

---

## 🆘 TROUBLESHOOTING

### Chrome не устанавливает .crx

**Проблема:** "Package is invalid: 'CRX_HEADER_INVALID'"

**Решение:**
- Проверьте, что использовали правильный PEM ключ
- Убедитесь, что Chrome не устаревший (обновите до последней версии)
- Попробуйте переупаковать: `npm run package`

### "This extension is not listed in the Chrome Web Store"

**Это нормально!** Просто нажмите "Add anyway"

### Auto-update не работает

**Проверьте:**
1. `update_url` в manifest.json указывает на правильный URL
2. `updates.xml` доступен по HTTPS
3. `appid` в updates.xml совпадает с Extension ID
4. .crx файл доступен для скачивания

---

## ✅ CHECKLIST ПЕРЕД РЕЛИЗОМ

- [ ] Version обновлена в manifest.json
- [ ] Код собран: `npm run build`
- [ ] PEM ключ существует и безопасно сохранён
- [ ] .crx файл создан: `npm run package`
- [ ] Extension ID задокументирован
- [ ] .crx файл загружен на сервер
- [ ] updates.xml обновлен (если используется)
- [ ] Тестовая установка выполнена успешно
- [ ] Юридический disclaimer видим на странице загрузки
- [ ] Инструкция по установке доступна пользователям
- [ ] Release notes написаны
- [ ] Пользователи уведомлены (email / dashboard notification)

---

**Created:** December 22, 2025  
**Version:** 1.0  
**Status:** Ready for Implementation  

