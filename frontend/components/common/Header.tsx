'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  // Показывать пункты меню только на главной странице
  const isHomePage = pathname === '/';

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

          {isHomePage && (
            <nav className="hidden md:flex items-center gap-10">
              <Link href="/#features" className="text-xs font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest">Возможности</Link>
              <Link href="/#pricing" className="text-xs font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest">Тарифы</Link>
              <Link href="/#faq" className="text-xs font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest">FAQ</Link>
            </nav>
          )}

          <div 
            className="flex items-center gap-4"
            suppressHydrationWarning={process.env.NODE_ENV === 'development'}
          >
            {showAuthContent && isAuthenticated ? (
              <div className="flex items-center gap-6">
                {user?.is_admin && (
                  <Link
                    href="/admin"
                    className="hidden sm:block text-[10px] font-black text-white hover:text-red-100 uppercase tracking-widest transition-all border border-red-500/40 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600/80 to-red-500/80 hover:from-red-600 hover:to-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                  >
                    Админ-панель
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="hidden sm:block text-[10px] font-black text-white hover:text-indigo-100 uppercase tracking-widest transition-all border border-indigo-500/40 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600/80 to-indigo-500/80 hover:from-indigo-600 hover:to-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)]"
                >
                  Личный кабинет
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500/10 text-white border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all text-[10px] font-black uppercase tracking-widest"
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

