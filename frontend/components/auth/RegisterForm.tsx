'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      await register(email, password);
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

      <h2 className="text-4xl font-black mb-2 text-center text-white tracking-tighter uppercase">Register</h2>
      <p className="text-white/30 text-center text-sm mb-10 font-medium uppercase tracking-widest">Create your account</p>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-2xl text-center uppercase tracking-widest">
          {String(error)}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-2 ml-4">
            Email Address
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
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-white/10 transition-all font-medium"
            placeholder="Min. 8 characters"
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-2 ml-4"
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-white/10 transition-all font-medium"
            placeholder="Repeat password"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(79,70,229,0.3)]"
        >
          {isLoading ? 'Creating...' : 'Register Now'}
        </button>
      </form>

      <p className="mt-10 text-center text-[10px] font-bold uppercase tracking-widest text-white/20">
        Already registered?{' '}
        <Link href="/login" className="text-indigo-400 hover:text-indigo-300 ml-2">
          Sign In
        </Link>
      </p>
    </div>
  );
}

