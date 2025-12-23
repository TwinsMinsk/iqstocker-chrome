# 🔄 ПЕРЕЗАПУСК СЕРВЕРОВ

## Шаг 1: Остановите текущие серверы

**В терминалах, где запущены серверы:**
- Нажмите `Ctrl+C` чтобы остановить процессы

---

## Шаг 2: Перезапустите Backend

```powershell
cd "C:\Project\Perplexity Cursor\backend"
python check_and_run.py
```

**Или:**
```powershell
cd "C:\Project\Perplexity Cursor\backend"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Шаг 3: Перезапустите Frontend (в НОВОМ терминале)

```powershell
cd "C:\Project\Perplexity Cursor\frontend"

# Очистите кэш Next.js
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Запустите dev сервер
npm run dev
```

---

## ✅ После перезапуска:

1. Откройте: http://localhost:3000/register
2. Попробуйте зарегистрироваться с:
   - Email: `test@test.com`
   - Password: `Test1234`

**Теперь должно работать!** ✅

---

## 🔍 Если все еще не работает:

1. **Очистите кэш браузера:** `Ctrl+Shift+R` (жесткая перезагрузка)
2. **Проверьте консоль браузера:** `F12` → Console
3. **Проверьте логи backend:** смотрите вывод в терминале backend

