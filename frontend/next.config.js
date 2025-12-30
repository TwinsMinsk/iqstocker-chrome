/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Включаем standalone только для production сборки
  ...(process.env.NODE_ENV === 'production' && { output: 'standalone' }),
  env: {
    // Next.js ожидает string. В CI/preview переменная может быть не задана — даём пустую строку.
    // На runtime код берёт process.env.NEXT_PUBLIC_API_URL, а в api client мы дополнительно нормализуем URL.
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  },
  // Production оптимизации
  compress: true,
  poweredByHeader: false,
  // Игнорируем системные файлы Windows при отслеживании изменений
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/C:/pagefile.sys',
          '**/C:/hiberfil.sys',
          '**/C:/swapfile.sys',
        ],
      };
    }
    return config;
  },
}

module.exports = nextConfig

