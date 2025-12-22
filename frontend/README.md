# 🎨 IQStocker Chrome Auto - Frontend

Next.js 14 frontend для сервиса автоматизации Midjourney.

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
npm install
# или
yarn install
# или
pnpm install
```

### 2. Настройка окружения

```bash
# Скопируйте .env.local.example в .env.local
cp .env.local.example .env.local

# Отредактируйте .env.local с вашими значениями
```

### 3. Запуск development сервера

```bash
npm run dev
# или
yarn dev
# или
pnpm dev
```

Приложение будет доступно на: http://localhost:3000

## 📁 Структура проекта

```
frontend/
├── app/                # Next.js App Router pages
│   ├── register/      # Страница регистрации
│   ├── login/         # Страница входа
│   ├── dashboard/     # Личный кабинет
│   └── admin/         # Админ панель
├── components/        # React компоненты
├── hooks/             # Custom React hooks
├── services/          # API клиенты
├── store/             # Zustand stores
├── types/             # TypeScript типы
└── styles/            # Global styles
```

## 🧪 Тестирование

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e
```

## 📚 Документация

Полная документация находится в `../Docs/`:
- `API_SPECIFICATION.md` - API endpoints
- `IMPLEMENTATION_GUIDE.md` - Пошаговое руководство

