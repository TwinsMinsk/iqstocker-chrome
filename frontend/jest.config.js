const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Путь к Next.js приложению для загрузки next.config.js и .env файлов
  dir: './',
})

// Добавляем кастомную конфигурацию Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  // Не падать, если тестов нет
  passWithNoTests: true,
}

module.exports = createJestConfig(customJestConfig)

