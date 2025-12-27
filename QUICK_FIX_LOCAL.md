# 🚨 БЫСТРОЕ ИСПРАВЛЕНИЕ ЛОКАЛЬНОЙ РАЗРАБОТКИ

## Проблема 1: CORS ошибка (frontend не подключается к backend)

### Решение:

1. **Создайте файл `frontend/.env.local`** (вручную, файл не в git):
   ```powershell
   cd "C:\Project\Perplexity Cursor\frontend"
   ```

2. **Создайте файл `.env.local`** со следующим содержимым:
   ```env
   NEXT_PUBLIC_API_URL=http://127.0.0.1:8001/api/v1
   ```

3. **Перезапустите frontend:**
   - Остановите текущий процесс (Ctrl+C)
   - Запустите снова: `npm run dev`

4. **Проверьте в консоли браузера (F12):**
   - Должно быть: `API Base URL: http://127.0.0.1:8001/api/v1`
   - Если видите другой URL - очистите кэш: `rm -r .next` и перезапустите

---

## Проблема 2: Hydration ошибка (Server: "Войти" Client: "Личный кабинет")

### ✅ УЖЕ ИСПРАВЛЕНО!

Исправление применено в `frontend/components/common/Header.tsx`. 

**Что делать:**
1. Перезапустите frontend (если еще не перезапускали)
2. Очистите кэш браузера (Ctrl+Shift+Delete) или откройте в режиме инкогнито
3. Ошибка должна исчезнуть

---

## 📋 Полная проверка:

- [ ] Backend запущен: `poetry run python run_local.py` (порт 8001)
- [ ] Файл `frontend/.env.local` создан с правильным URL
- [ ] Frontend перезапущен после создания `.env.local`
- [ ] В консоли браузера правильный API URL
- [ ] Нет ошибок hydration

---

## 📚 Подробная инструкция:

См. `LOCAL_DEVELOPMENT_GUIDE.md` и `frontend/ENV_LOCAL_SETUP.md`

