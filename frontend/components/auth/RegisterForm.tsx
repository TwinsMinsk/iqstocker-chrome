'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

// Функция для чтения cookie (простая реализация без библиотеки)
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

// Функция для удаления cookie
function removeCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const { register, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (password.length < 8) {
      setError('Пароль должен содержать минимум 8 символов');
      return;
    }

    // Проверка длины в байтах только для паролей с не-ASCII символами
    // Для обычных ASCII паролей (до 72 символов) проверка не нужна
    // Проверяем байты только если пароль содержит не-ASCII символы
    const hasNonAscii = /[^\x00-\x7F]/.test(password);
    if (hasNonAscii) {
      const passwordBytes = new TextEncoder().encode(password);
      if (passwordBytes.length > 72) {
        setError('Пароль не может быть длиннее 72 байт. Используйте более короткий пароль');
        return;
      }
    }

    try {
      // Читаем реферальный код из cookie
      const refCode = getCookie('ref_code');
      
      await register(email, password, refCode || undefined);
      
      // Удаляем cookie после успешной регистрации
      if (refCode) {
        removeCookie('ref_code');
      }
      
      router.push('/dashboard');
    } catch (err: any) {
      // Обработка ошибок валидации FastAPI/Pydantic
      let errorMessage = 'Ошибка регистрации';
      
      if (err?.response?.data?.detail) {
        const detail = err.response.data.detail;
        
        // Если это массив ошибок валидации (Pydantic format)
        if (Array.isArray(detail)) {
          errorMessage = detail.map((item: any) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object' && item.msg) return item.msg;
            return 'Ошибка валидации';
          }).filter(Boolean).join('. ');
        } 
        // Если это строка
        else if (typeof detail === 'string') {
          errorMessage = detail;
        }
        // Если это объект с сообщением
        else if (detail && typeof detail === 'object' && detail.message) {
          errorMessage = detail.message;
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-10 bg-white/5 border border-white/10 rounded-[40px] backdrop-blur-xl shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 blur-3xl -z-10"></div>

      <h2 className="text-4xl font-black mb-2 text-center text-white tracking-tighter uppercase">Регистрация</h2>
      <p className="text-white/30 text-center text-sm mb-10 font-medium uppercase tracking-widest">Создайте свой аккаунт</p>

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
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-white/10 transition-all font-medium pr-12"
              placeholder="Мин. 8 символов"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-2 ml-4"
          >
            Подтвердите пароль
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-white/10 transition-all font-medium pr-12"
              placeholder="Повторите пароль"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showConfirmPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(79,70,229,0.3)]"
        >
          {isLoading ? 'Создание...' : 'Зарегистрироваться'}
        </button>
      </form>

      <p className="mt-10 text-center text-[10px] font-bold uppercase tracking-widest text-white/20">
        Уже зарегистрированы?{' '}
        <Link href="/login" className="text-indigo-400 hover:text-indigo-300 ml-2">
          Войти
        </Link>
      </p>
    </div>
  );
}

