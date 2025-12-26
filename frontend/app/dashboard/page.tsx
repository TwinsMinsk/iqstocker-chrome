'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
          <h1 className="text-xs font-black tracking-[0.3em] text-indigo-500 uppercase mb-2">Рабочая область</h1>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
            С ВОЗВРАЩЕНИЕМ,<br/>
            <span className="text-white/40">{user?.email?.split('@')[0].toUpperCase()}</span>
          </h2>
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
           <div>IQStocker Auto v1.0.0</div>
        </footer>
      </div>
    </div>
  );
}


