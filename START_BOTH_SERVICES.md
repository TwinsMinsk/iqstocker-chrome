# 🚀 Быстрый запуск проекта

## Запуск Backend (Python/FastAPI)

```powershell
# Перейдите в папку backend
cd backend

# Запустите сервер (выберите один из вариантов):

# Вариант 1: Используя check_and_run.py (рекомендуется)
python check_and_run.py

# Вариант 2: Напрямую через uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend будет доступен на: **http://localhost:8000**

---

## Запуск Frontend (Next.js)

**Откройте НОВЫЙ терминал** (не закрывайте backend):

```powershell
# Перейдите в папку frontend
cd frontend

# Очистите кэш Next.js (ВАЖНО после изменений!)
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Установите зависимости (если еще не установлены)
npm install

# Запустите dev сервер
npm run dev
```

Frontend будет доступен на: **http://localhost:3000**

---

## ⚠️ Важно!

1. **Backend и Frontend должны запускаться в РАЗНЫХ терминалах**
2. **Сначала запустите Backend**, потом Frontend
3. **После изменений в коде** очистите кэш Next.js командой выше
4. **Если стили не применяются** - очистите кэш браузера (Ctrl+Shift+R)

---

## Проверка работы

1. Backend API: http://localhost:8000/docs (Swagger UI)
2. Frontend: http://localhost:3000
3. Проверьте консоль браузера на ошибки (F12)

