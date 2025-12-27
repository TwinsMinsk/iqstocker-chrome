# 🔧 Настройка .env.local для локальной разработки

## ⚠️ ВАЖНО: Создайте этот файл вручную!

Файл `.env.local` не должен попадать в git (он в `.gitignore`), поэтому создайте его вручную.

## 📝 Инструкция:

1. **Перейдите в папку frontend:**
   ```powershell
   cd "C:\Project\Perplexity Cursor\frontend"
   ```

2. **Создайте файл `.env.local`** (без расширения, точка в начале обязательна!)

3. **Добавьте в файл следующее содержимое:**
   ```env
   NEXT_PUBLIC_API_URL=http://127.0.0.1:8001/api/v1
   ```

4. **Сохраните файл**

5. **Перезапустите frontend dev server:**
   - Остановите текущий процесс (Ctrl+C)
   - Запустите снова: `npm run dev`

## ✅ Проверка:

После перезапуска в консоли браузера (F12) вы должны увидеть:
```
API Base URL: http://127.0.0.1:8001/api/v1
```

Если видите другой URL или ошибку CORS - проверьте, что:
- ✅ Файл `.env.local` создан в папке `frontend/`
- ✅ В файле правильный URL: `http://127.0.0.1:8001/api/v1`
- ✅ Frontend перезапущен после создания файла

## 🔍 Если не работает:

1. Убедитесь, что backend запущен на порту 8001:
   ```powershell
   cd "C:\Project\Perplexity Cursor\backend"
   poetry run python run_local.py
   ```

2. Проверьте, что файл называется именно `.env.local` (не `.env.local.txt`)

3. Очистите кэш Next.js:
   ```powershell
   cd frontend
   rm -r .next
   npm run dev
   ```

