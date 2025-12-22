# 📚 CURSOR DEVELOPMENT WORKFLOW
## Как использовать эти документы в Cursor IDE

**Created:** December 22, 2025  
**For:** Single developer using Cursor AI  
**Updated:** December 22, 2025  

---

## 🎯 СТРУКТУРА ДОКУМЕНТОВ

У вас есть 6 основных файлов:

### 1. **PROJECT_SPECIFICATION.md** (Основное ТЗ)
- 📋 Полная спецификация проекта
- 🎯 Разделение на 3 фазы (Phase 1, 2, 3)
- 💻 Технологический стек
- 🔐 Требования безопасности
- 📊 Функциональные требования

**Когда использовать:**
- Перед началом разработки (обзор проекта)
- При потере направления (вернись к целям)
- Для интеграции новых требований

---

### 2. **IMPLEMENTATION_GUIDE.md** (Пошаговое руководство)
- 📂 Полная структура проекта (все папки/файлы)
- 🚀 Этап за этапом инструкции (Week 1-5)
- 💡 Примеры промптов для Cursor
- ✅ Чеклист для каждой фазы

**Когда использовать:**
- Каждый день (выбери текущую неделю)
- При создании новой папки/файла
- Для работы с Cursor (@Codebase промпты)

---

### 3. **API_SPECIFICATION.md** (REST API)
- 🔌 Все endpoint'ы (Auth, Users, Billing, Admin, etc.)
- 📤 Request/Response примеры (JSON)
- ❌ Коды ошибок
- 🧪 Как тестировать webhook

**Когда использовать:**
- При разработке backend (смотри требуемый endpoint)
- При разработке frontend (как вызывать API)
- При разработке extension (валидация ключа, логирование)

---

### 4. **DATABASE_SCHEMA.md** (Структура БД)
- 🗄️ SQL таблицы (5 таблиц)
- 📊 SQLAlchemy модели
- 🔧 Alembic миграция (готовая)
- 📈 Indexes и performance tips

**Когда использовать:**
- Перед созданием models.py (скопируй SQL)
- При написании запросов (смотри примеры)
- При интеграции с БД (структура таблиц)

---

### 5. **LAUNCH_CHECKLIST.md** (Развёртывание)
- 🚀 Подробный чеклист для каждой фазы
- ✅ Security audit items
- 📊 Performance checks
- 🎯 Post-launch monitoring

**Когда использовать:**
- Перед завершением каждой фазы
- Перед деплоем на production
- Для проверки готовности к запуску

---

### 6. **CURSOR_DEVELOPMENT_WORKFLOW.md** (этот файл)
- 📚 Как использовать все документы
- 💡 Лучшие практики Cursor
- 🎯 Каждодневный workflow

---

## 🎯 КАЖДОДНЕВНЫЙ WORKFLOW

### Утро (30 мин)

1. **Открой PROJECT_SPECIFICATION.md**
   - Проверь, какая фаза текущая
   - Какая неделя (Week 1-5)?
   - Какие компоненты нужно сделать?

2. **Открой IMPLEMENTATION_GUIDE.md**
   - Найди текущую неделю (Шаг X.Y)
   - Прочитай что делать сегодня
   - Скопируй требуемую структуру папок

3. **Стартуй разработку**

### День (7-8 часов)

#### Работа в Cursor:

**Для новой фичи используй этот процесс:**

```
1. Найди requirement в IMPLEMENTATION_GUIDE (текущая неделя)
2. Посмотри API_SPECIFICATION для требуемого endpoint'а
3. Посмотри DATABASE_SCHEMA для требуемых таблиц
4. Создай промпт для Cursor:

    @Codebase
    
    Промпт:
    "Я разрабатываю [компонент] для Midjourney Auto.
    Требования (из IMPLEMENTATION_GUIDE неделя X):
    - [требование 1]
    - [требование 2]
    
    API endpoint (из API_SPECIFICATION):
    - [endpoint URL и структура]
    
    Database (из DATABASE_SCHEMA):
    - [таблица и поля]
    
    Пожалуйста создай:
    1. [файл 1]
    2. [файл 2]
    
    Используй [технология/pattern/style]."

5. Cursor генерирует код
6. Review код, попроси изменения
7. Комитим: git add . && git commit -m "feat: [компонент]"
```

#### Примеры промптов для Cursor:

**Пример 1: Auth endpoint**
```
@Codebase

Я разрабатываю POST /auth/register endpoint для Midjourney Auto.

Требования (из IMPLEMENTATION_GUIDE неделя 1-2):
- Email + password регистрация
- Автоматическое создание free subscription (50 кредитов)
- JWT token generation
- Email verification письмо

API spec (из API_SPECIFICATION):
- POST /auth/register возвращает access_token + refresh_token + subscription

Database (из DATABASE_SCHEMA):
- users table
- subscriptions table
- email_verification_token field

Пожалуйста создай:
1. app/api/v1/endpoints/auth.py - register endpoint
2. app/services/auth_service.py - create_user() функция
3. app/schemas/auth.py - RegisterRequest schema

Используй FastAPI, Pydantic, SQLAlchemy.
Добавь обработку ошибок и логирование.
```

**Пример 2: Dashboard component**
```
@Codebase

Я разрабатываю dashboard page для Midjourney Auto (Next.js).

Требования (из IMPLEMENTATION_GUIDE неделя 2-3):
- Показать баланс кредитов
- Показать статус подписки
- Показать лицензионный ключ
- Кнопка для скачивания расширения

API endpoints (из API_SPECIFICATION):
- GET /users/me возвращает balance, subscription, license_key

Пожалуйста создай:
1. app/dashboard/page.tsx - main dashboard page
2. components/dashboard/BalanceCard.tsx
3. components/dashboard/SubscriptionCard.tsx
4. components/dashboard/LicenseKeyCard.tsx

Используй React 18, TypeScript, Tailwind CSS.
Добавь loading states и error handling.
```

**Пример 3: Extension logic**
```
@Codebase

Я разрабатываю Content Script для Chrome MV3 расширения.

Требования (из IMPLEMENTATION_GUIDE неделя 3-4):
- Найти input field в Discord (с fallback селекторами)
- Найти Send button (с fallback селекторами)
- Отправить промпты с интервалом
- Обнаружить ошибки и паузировать

API endpoint (из API_SPECIFICATION):
- POST /extensions/validate-key (для валидации)
- POST /extensions/log-usage (для логирования)

Пожалуйста создай:
1. src/content.ts - Content Script
2. src/utils/dom-helpers.ts - Discord DOM utilities
3. src/utils/logger.ts - IndexedDB logging

Используй TypeScript, async/await.
Добавь error handling и retry logic.
```

### Вечер (30 мин)

1. **Коммитни работу**
   ```bash
   git add .
   git commit -m "feat: [что сделал]"
   git push origin develop
   ```

2. **Обнови статус**
   - Галочка в IMPLEMENTATION_GUIDE что ты сделал
   - Сохрани прогресс

3. **Подготовка к завтра**
   - Посмотри что нужно делать завтра
   - Если сложная фича → подумай как её разбить

---

## 💡 ЛУЧШИЕ ПРАКТИКИ CURSOR

### 1. Всегда используй @Codebase в промптах

```
✅ ПРАВИЛЬНО:
@Codebase
Промпт: "Создай User model используя существующие таблицы..."

❌ НЕПРАВИЛЬНО:
Промпт: "Создай User model..." (без @Codebase)
```

**Почему:** @Codebase дает контекст всего проекта, помогает Cursor писать код, совместимый с остальным.

---

### 2. Разбивай большие задачи на маленькие

```
❌ НЕПРАВИЛЬНО (слишком много одновременно):
"Создай полный auth систему с регистрацией, логином, забытым паролем, 2FA"

✅ ПРАВИЛЬНО (по частям):
Часть 1: "Создай POST /auth/register endpoint"
Часть 2: "Создай POST /auth/login endpoint"
Часть 3: "Создай refresh token mechanism"
Часть 4: "Добавь обработку ошибок"
```

---

### 3. Давай файлы для редактирования, не переписывания

```
✅ ПРАВИЛЬНО:
"Отредактируй app/services/auth_service.py:
- Добавь email verification logic в create_user()
- Покажи мне какие строки ты изменил (diff format)"

❌ НЕПРАВИЛЬНО:
"Переписи весь файл app/services/auth_service.py"
```

---

### 4. Проси примеры и объяснения

```
✅ ХОРОШО:
"Создай util функцию для валидации лицензионного ключа.
Покажи пример как её использовать в endpoint'е.
Объясни как работает.
Добавь comments в коде."
```

---

### 5. Итеративное улучшение

```
Итерация 1:
Cursor: создал базовый код

Итерация 2:
Ты: "Улучши error handling"

Итерация 3:
Ты: "Добавь логирование"

Итерация 4:
Ты: "Оптимизируй database query"

Итерация 5:
Ты: "Готово, committing"
```

---

## 🔗 CROSS-REFERENCE GUIDE

### Нужно создать Backend endpoint?
1. Найди requirement в **IMPLEMENTATION_GUIDE** (неделя X)
2. Посмотри спецификацию в **API_SPECIFICATION** (какой endpoint)
3. Посмотри БД в **DATABASE_SCHEMA** (какие таблицы)
4. Напиши промпт для Cursor
5. Чеклист в **LAUNCH_CHECKLIST** (неделя X)

### Нужно создать Frontend компонент?
1. Найди requirement в **IMPLEMENTATION_GUIDE** (неделя X)
2. Посмотри API в **API_SPECIFICATION** (какой endpoint вызывать)
3. Напиши промпт для Cursor
4. Чеклист в **LAUNCH_CHECKLIST** (неделя X)

### Нужно создать Extension функцию?
1. Найди requirement в **IMPLEMENTATION_GUIDE** (неделя X)
2. Посмотри API в **API_SPECIFICATION** (какие endpoints)
3. Посмотри DOM helpers requirements
4. Напиши промпт для Cursor
5. Чеклист в **LAUNCH_CHECKLIST** (неделя X)

### Не знаешь как БД работает?
1. Посмотри **DATABASE_SCHEMA.md**
2. Найди требуемую таблицу
3. Скопируй SQLAlchemy model
4. Используй в коде

---

## 🚀 ФАЗОВЫЙ WORKFLOW

### Phase 1: MVP (Weeks 1-5)

```
Week 1-2: Backend
├── IMPLEMENTATION_GUIDE: "Шаг 1.1, 1.2, 1.3"
├── API_SPECIFICATION: Используй для знания что создавать
├── DATABASE_SCHEMA: Используй для моделей
└── LAUNCH_CHECKLIST: Week 1-2 items

Week 2-3: Frontend
├── IMPLEMENTATION_GUIDE: "Шаг 2.1, 2.2, 2.3"
├── API_SPECIFICATION: Используй для знания какой API вызывать
└── LAUNCH_CHECKLIST: Week 2-3 items

Week 3-4: Extension
├── IMPLEMENTATION_GUIDE: "Шаг 3.1, 3.2, 3.3"
├── API_SPECIFICATION: Используй для знания какие endpoints
└── LAUNCH_CHECKLIST: Week 3-4 items

Week 4-5: Integration & QA
├── IMPLEMENTATION_GUIDE: "Шаг 4.1, 4.2, 4.3"
├── All specs: Финальная интеграция
└── LAUNCH_CHECKLIST: Week 4-5 items (все must-haves)
```

### Phase 2: Polish (Weeks 6-7)

```
используй все документы
реализуй улучшения
готовься к production
```

---

## 🎯 ШПАРГАЛКА: КОГДА ЧТО СМОТРЕТЬ

| Ситуация | Смотри файл |
|----------|------------|
| "Как начать разработку?" | IMPLEMENTATION_GUIDE (текущая неделя) |
| "Какой endpoint нужно создать?" | API_SPECIFICATION |
| "Какие поля в таблице?" | DATABASE_SCHEMA |
| "Готов ли я к деплою?" | LAUNCH_CHECKLIST |
| "Какая текущая фаза?" | PROJECT_SPECIFICATION |
| "Как это всё использовать?" | Этот файл (CURSOR_DEVELOPMENT_WORKFLOW) |
| "Какой промпт написать в Cursor?" | IMPLEMENTATION_GUIDE (примеры) |

---

## 📱 ПРИМЕР: ПОЛНЫЙ ДЕНЬ РАЗРАБОТКИ

### 09:00 Утро

Открываю IMPLEMENTATION_GUIDE, вижу:
```
### Шаг 1.2: Database & Models (День 1-2)

Используйте Cursor с промптом:
"Создай полные models для FastAPI приложения Midjourney Auto..."
```

### 09:15 Работа в Cursor

```
@Codebase

Промпт: "Создай полные models для FastAPI приложения Midjourney Auto:
1. User model (из DATABASE_SCHEMA)
2. Subscription model (из DATABASE_SCHEMA)
3. LicenseKey model (из DATABASE_SCHEMA)
4. Transaction model (из DATABASE_SCHEMA)
5. ExtensionLog model (из DATABASE_SCHEMA)

Используй SQLAlchemy 2.0 с UUID primary keys..."

Cursor создаёт код → я review → итеративно улучшаю
```

### 11:30 Тестирование

```bash
pytest tests/test_models.py
```

Все passing ✅

### 12:00 Обед

### 13:00 Следующая фича

Повторяю процесс для auth endpoints...

### 17:30 Коммит

```bash
git add .
git commit -m "feat: create database models and auth endpoints (Week 1)"
git push origin develop
```

### 17:45 Завтра подготовка

Посмотрю IMPLEMENTATION_GUIDE что делать завтра (Frontend setup)

### 18:00 Конец дня ✅

---

## 🆘 ЕСЛИ ЗАСТРЯЛ

### "Не знаю как начать Week X"
→ Открой IMPLEMENTATION_GUIDE, найди "Шаг X.Y"

### "Не знаю какой endpoint создать"
→ Посмотри API_SPECIFICATION (какой требуется)

### "Не знаю структуру базы данных"
→ Посмотри DATABASE_SCHEMA (вся структура там)

### "Не знаю какой промпт написать для Cursor"
→ Посмотри IMPLEMENTATION_GUIDE (там примеры промптов)

### "Не знаю готов ли я к деплою"
→ Посмотри LAUNCH_CHECKLIST (все items надо checkboxing)

### "Потерялся в проекте"
→ Прочитай PROJECT_SPECIFICATION (полный обзор + фазы)

---

## 🎓 ИТОГО

**Эти 6 документов содержат всё что нужно для разработки:**

1. 📋 **PROJECT_SPECIFICATION** - Что делать (WHAT)
2. 🚀 **IMPLEMENTATION_GUIDE** - Как делать (HOW), неделю за неделей
3. 🔌 **API_SPECIFICATION** - Какие endpoints (WHERE data goes)
4. 🗄️ **DATABASE_SCHEMA** - Как хранить (WHERE data stored)
5. 🚀 **LAUNCH_CHECKLIST** - Готов ли к production (WHEN to ship)
6. 📚 **Этот файл** - Как всё использовать (HOW to use these docs)

**Начни с IMPLEMENTATION_GUIDE (текущая неделя) → остальные используй по необходимости. Успехов! 🚀**

---

**Последнее обновление:** December 22, 2025  
**Версия:** 1.0  
**Ready for development!** ✅