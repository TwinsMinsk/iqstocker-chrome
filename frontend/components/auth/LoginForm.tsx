'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      // Обработка ошибок валидации FastAPI/Pydantic
      let errorMessage = 'Ошибка входа';
      
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        
        // Если это массив ошибок валидации
        if (Array.isArray(detail)) {
          errorMessage = detail.map((item: any) => {
            if (typeof item === 'string') return item;
            if (item.msg) return item.msg;
            return JSON.stringify(item);
          }).join('. ');
        } 
        // Если это строка
        else if (typeof detail === 'string') {
          errorMessage = detail;
        }
        // Если это объект с сообщением
        else if (detail.message) {
          errorMessage = detail.message;
        }
      }
      
      setError(errorMessage);
    }
  };

  const handleGoogleLogin = () => {
    // TODO: Реализовать OAuth Google
    window.location.href = '/api/auth/callback/google';
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-10 bg-white/5 border border-white/10 rounded-[40px] backdrop-blur-xl shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 blur-3xl -z-10"></div>

      <h2 className="text-4xl font-black mb-2 text-center text-white tracking-tighter uppercase">Вход</h2>
      <p className="text-white/30 text-center text-sm mb-10 font-medium uppercase tracking-widest">Авторизуйтесь, чтобы продолжить</p>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-2xl text-center uppercase tracking-widest">
          {String(error)}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-2 ml-4">
            Email адрес
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-white/10 transition-all font-medium"
            placeholder="name@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-2 ml-4">
            Пароль
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-white/10 transition-all font-medium"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(79,70,229,0.3)]"
        >
          {isLoading ? 'Загрузка...' : 'Войти'}
        </button>
      </form>

      <div className="mt-10">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
            <span className="px-4 bg-[#0a0a0f] text-white/20">Сторонние сервисы</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="mt-8 w-full py-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-xs font-bold text-white/60 uppercase tracking-widest"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google Вход
        </button>
      </div>

      <p className="mt-10 text-center text-[10px] font-bold uppercase tracking-widest text-white/20">
        Впервые здесь?{' '}
        <Link href="/register" className="text-indigo-400 hover:text-indigo-300 ml-2">
          Создать аккаунт
        </Link>
      </p>
    </div>
  );
}

