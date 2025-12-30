'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Предотвращаем hydration mismatch - проверяем аутентификацию только на клиенте
  // На сервере mounted = false, поэтому всегда показываем "Войти"
  // На клиенте после монтирования (mounted = true) показываем реальное состояние
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };
  
  // Для локальной разработки: всегда показываем "Войти" до монтирования, чтобы избежать hydration mismatch
  // На сервере (mounted = false) всегда показываем "Войти"
  // На клиенте после монтирования (mounted = true) показываем реальное состояние
  // В production это работает так же, но там обычно нет таких расхождений
  const showAuthContent = mounted;

  return (
    <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link 
            href="/" 
            className="flex items-center gap-2 group"
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-xl shadow-[0_0_20px_rgba(79,70,229,0.4)] group-hover:scale-110 transition-transform text-white">IQ</div>
            <span className="text-xl font-black tracking-tighter text-white">СТОКЕР<span className="text-white/40">ГЕНЕРИНГ</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-10">
            <Link href="/#features" className="text-xs font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest">Возможности</Link>
            <Link href="/#pricing" className="text-xs font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest">Тарифы</Link>
            <Link href="/#faq" className="text-xs font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest">FAQ</Link>
          </nav>

          <div 
            className="flex items-center gap-4"
            suppressHydrationWarning={process.env.NODE_ENV === 'development'}
          >
            {showAuthContent && isAuthenticated ? (
              <div className="flex items-center gap-6">
                <Link
                  href="/dashboard"
                  className="hidden sm:block text-xs font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-colors"
                >
                  Личный кабинет
                </Link>
                <Link
                  href="/dashboard/referral"
                  className="hidden sm:block text-xs font-black text-green-400 hover:text-green-300 uppercase tracking-widest transition-colors flex items-center gap-1"
                  title="Реферальная программа"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Бонусы
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all text-[10px] font-black uppercase tracking-widest"
                >
                  Выйти
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="px-6 py-2.5 text-xs font-bold text-white/60 hover:text-white transition-all uppercase tracking-widest"
                >
                  Войти
                </Link>
                <Link
                  href="/register"
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] font-black text-[10px] uppercase tracking-widest"
                >
                  Начать
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

