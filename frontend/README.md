# 🎨 IQStocker Chrome Auto - Frontend

Next.js 14 frontend для сервиса автоматизации Midjourney.

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
npm install
# или
yarn install
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
```

Приложение будет доступно на: http://localhost:3000

## 📁 Структура проекта

```
frontend/
├── app/                # Next.js App Router
│   ├── page.tsx       # Landing page
│   ├── login/         # Страница входа
│   ├── register/      # Страница регистрации
│   ├── dashboard/     # Dashboard страницы
│   └── admin/         # Admin панель
├── components/         # React компоненты
│   ├── auth/          # Auth компоненты
│   ├── dashboard/     # Dashboard компоненты
│   └── common/        # Общие компоненты
├── services/          # API клиенты
│   └── api/           # API методы
├── store/             # Zustand stores
└── types/             # TypeScript типы
```

## 🛠️ Технологии

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Query** - Data fetching
- **Axios** - HTTP client

## 📚 API Integration

Frontend использует backend API через:
- `services/api/client.ts` - Axios клиент
- `services/api/auth.ts` - Auth методы
- `services/api/billing.ts` - Billing методы

## 🔧 Переменные окружения

См. `.env.local.example` для полного списка.

Основные:
- `NEXT_PUBLIC_API_URL` - URL backend API
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth client ID
- `NEXTAUTH_SECRET` - NextAuth secret
- `NEXTAUTH_URL` - NextAuth URL

## 🧪 Тестирование

```bash
# Unit тесты
npm test

# E2E тесты
npm run test:e2e
```

## 📦 Build

```bash
# Production build
npm run build

# Start production server
npm start
```

## 📚 Документация

Полная документация находится в `../Docs/`:
- `IMPLEMENTATION_GUIDE.md` - Пошаговое руководство
- `API_SPECIFICATION.md` - API документация
