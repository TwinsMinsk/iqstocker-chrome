# 🚀 Быстрый старт БЕЗ Docker

## Вариант 1: Запуск без базы данных (для проверки)

Сервер может запуститься без БД для проверки базовой функциональности:

```bash
cd backend
python run_server.py
```

Или:
```bash
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Проверка:**
- Откройте браузер: http://127.0.0.1:8000
- Health check: http://127.0.0.1:8000/health
- API docs: http://127.0.0.1:8000/api/docs

---

## Вариант 2: С SQLite (рекомендуется для разработки)

### Шаг 1: Создайте .env файл

```bash
cd backend
copy .env.example .env
```

Отредактируйте `.env`:
```env
USE_SQLITE=true
DATABASE_URL=sqlite:///./iqstocker.db
SECRET_KEY=your-secret-key-here
DEBUG=true
```

### Шаг 2: Адаптируйте миграции для SQLite

SQLite не поддерживает некоторые функции PostgreSQL. Нужно создать упрощённую миграцию.

**Быстрое решение:** Используйте облачный PostgreSQL (см. Вариант 3)

---

## Вариант 3: С облачным PostgreSQL (лучший вариант)

### Railway PostgreSQL (рекомендуется):

1. Зарегистрируйтесь на https://railway.app
2. Создайте новый проект
3. Добавьте PostgreSQL сервис
4. Скопируйте `DATABASE_URL` из Railway
5. Вставьте в `backend/.env`:
   ```
   USE_SQLITE=false
   DATABASE_URL=postgresql://user:pass@host.railway.app:5432/railway
   ```

### Supabase (бесплатный):

1. Зарегистрируйтесь на https://supabase.com
2. Создайте проект
3. Settings → Database → Connection string
4. Скопируйте `DATABASE_URL`
5. Вставьте в `backend/.env`

### Применение миграций:

```bash
cd backend
alembic upgrade head
```

---

## Запуск сервера

```bash
cd backend
python run_server.py
```

Или:
```bash
cd backend
python -m uvicorn app.main:app --reload
```

---

## Проверка работы

1. **Health check:**
   ```
   http://127.0.0.1:8000/health
   ```

2. **API документация:**
   ```
   http://127.0.0.1:8000/api/docs
   ```

3. **Root endpoint:**
   ```
   http://127.0.0.1:8000/
   ```

---

## Установка зависимостей

Если нужно установить зависимости:

```bash
cd backend
pip install -r requirements.txt
```

Или выборочно:
```bash
pip install fastapi uvicorn sqlalchemy pydantic pydantic-settings
```

---

## Redis (опционально)

Redis не обязателен на начальном этапе. Можно:
- Пропустить (оставить `REDIS_URL=None`)
- Использовать облачный Redis (Upstash, Railway)

---

**Готово! Сервер должен работать! 🎉**

