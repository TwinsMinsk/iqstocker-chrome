'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { LicenseKeyCard } from '@/components/dashboard/LicenseKeyCard';
import { ExtensionDownload } from '@/components/dashboard/ExtensionDownload';

export default function DashboardPage() {
  const { isAuthenticated, fetchUser, user, accessToken } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Если есть токен, но пользователь не загружен, загружаем его
    if (accessToken && !user) {
      fetchUser();
      return;
    }
    
    // Если нет токена и не аутентифицирован, редиректим на логин
    if (!accessToken && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Если аутентифицирован, но пользователь не загружен, загружаем
    if (isAuthenticated && !user) {
      fetchUser();
    }
  }, [isAuthenticated, accessToken, user, router, fetchUser]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="container mx-auto px-4">
        <header className="mb-12">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xs font-black tracking-[0.3em] text-indigo-500 uppercase mb-2">Рабочая область</h1>
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                С ВОЗВРАЩЕНИЕМ,<br/>
                <span className="text-white/40">{user?.email?.split('@')[0].toUpperCase()}</span>
              </h2>
            </div>
            {user?.is_admin && (
              <Link
                href="/admin"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-black text-xs uppercase tracking-widest transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.4)]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Админ-панель
              </Link>
            )}
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <div className="h-full">
            <BalanceCard />
          </div>
          <div className="h-full">
            <LicenseKeyCard />
          </div>
        </div>

        <div className="grid lg:grid-cols-1 gap-8">
          <ExtensionDownload />
        </div>
        
        <footer className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-white/20 uppercase tracking-[0.2em]">
           <div>Статус: Все системы работают</div>
        </footer>
      </div>
    </div>
  );
}


