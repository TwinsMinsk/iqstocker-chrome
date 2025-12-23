'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user, fetchUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    fetchUser().then(() => {
      if (!user?.is_admin) {
        router.push('/dashboard');
      }
    });
  }, [isAuthenticated, router, fetchUser, user?.is_admin]);

  if (!isAuthenticated || !user?.is_admin) {
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
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

