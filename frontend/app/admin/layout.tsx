'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user, fetchUser, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  // Если пользователь уже загружен, сразу помечаем как инициализированный
  const [isInitialized, setIsInitialized] = useState(!!user);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Если не аутентифицирован, редиректим на логин
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Если пользователь уже загружен, помечаем как инициализированный
    if (user) {
      setIsInitialized(true);
      return;
    }

    // Загружаем профиль пользователя только один раз
    if (!hasFetchedRef.current && !isLoading) {
      hasFetchedRef.current = true;
      fetchUser().finally(() => {
        setIsInitialized(true);
      });
    }
  }, [isAuthenticated, router, fetchUser, user, isLoading]);

  // Редирект на dashboard, если нет прав администратора (только после загрузки)
  useEffect(() => {
    if (isInitialized && (!user || !user.is_admin)) {
      router.push('/dashboard');
    }
  }, [isInitialized, user, router]);

  // Показываем спиннер во время загрузки (только если пользователь еще не загружен)
  if ((isLoading || !isInitialized) && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Если пользователь загружен, но не админ, показываем null (редирект произойдет в useEffect)
  if (!user || !user.is_admin) {
    return null;
  }

  const isActive = (path: string) => pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Админ-панель</h1>
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Вернуться в Dashboard
            </Link>
          </div>
        </div>
      </div>

      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            <Link
              href="/admin"
              className={`border-b-2 py-4 px-1 text-sm font-medium transition ${
                isActive('/admin')
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Обзор
            </Link>
            <Link
              href="/admin/users"
              className={`border-b-2 py-4 px-1 text-sm font-medium transition ${
                isActive('/admin/users')
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Пользователи
            </Link>
            <Link
              href="/admin/logs"
              className={`border-b-2 py-4 px-1 text-sm font-medium transition ${
                isActive('/admin/logs')
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Логи
            </Link>
            <Link
              href="/admin/promocodes"
              className={`border-b-2 py-4 px-1 text-sm font-medium transition ${
                isActive('/admin/promocodes')
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Промокоды
            </Link>
            <Link
              href="/admin/billing"
              className={`border-b-2 py-4 px-1 text-sm font-medium transition ${
                isActive('/admin/billing')
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Биллинг
            </Link>
            <Link
              href="/admin/analytics"
              className={`border-b-2 py-4 px-1 text-sm font-medium transition ${
                isActive('/admin/analytics')
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Аналитика
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

