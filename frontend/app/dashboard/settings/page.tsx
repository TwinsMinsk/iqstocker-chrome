'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api/client';

export default function SettingsPage() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Форма изменения email
  const [email, setEmail] = useState('');

  // Форма изменения пароля
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.email) {
      setEmail(user.email);
    }
  }, [isAuthenticated, user, router]);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // TODO: Подключить реальный API endpoint
      // await api.patch('/users/me', { email });
      
      setMessage({ type: 'success', text: 'Email успешно обновлен. Проверьте почту для подтверждения.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Ошибка при обновлении email' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Пароли не совпадают' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Пароль должен быть минимум 8 символов' });
      return;
    }

    setLoading(true);

    try {
      // TODO: Подключить реальный API endpoint
      // await api.post('/users/change-password', {
      //   current_password: currentPassword,
      //   new_password: newPassword,
      // });

      setMessage({ type: 'success', text: 'Пароль успешно изменен' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Ошибка при изменении пароля' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Вы уверены, что хотите удалить аккаунт? Это действие необратимо.')) {
      return;
    }

    if (!confirm('Все ваши данные будут удалены. Продолжить?')) {
      return;
    }

    setLoading(true);

    try {
      // TODO: Подключить реальный API endpoint
      // await api.delete('/users/me');
      
      logout();
      router.push('/');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Ошибка при удалении аккаунта' });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <header className="mb-12">
        <h1 className="text-xs font-black tracking-[0.3em] text-indigo-500 uppercase mb-2">Preferences</h1>
        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none">
          Account <span className="text-white/20 tracking-normal italic">Settings</span>
        </h2>
      </header>

      {/* Сообщения */}
      {message && (
        <div
          className={`mb-8 p-5 rounded-2xl text-xs font-bold uppercase tracking-widest text-center border animate-fade-in ${
            message.type === 'success'
              ? 'bg-green-500/10 text-green-400 border-green-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid md:grid-cols-1 gap-8">
        {/* Информация о аккаунте */}
        <div className="bg-white/5 border border-white/10 rounded-[40px] p-10 relative overflow-hidden">
          <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-8 border-b border-white/5 pb-6">Account Profile</h2>
          <div className="space-y-6">
            <div className="flex justify-between items-center group">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/20">UUID</span>
              <span className="font-mono text-xs text-white/60 group-hover:text-white transition-colors">{user?.id}</span>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Email Address</span>
              <span className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Email Status</span>
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${user?.email_verified ? 'text-green-400 border-green-500/20 bg-green-500/5' : 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5'}`}>
                {user?.email_verified ? 'Verified' : 'Unverified'}
              </span>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Registered</span>
              <span className="text-xs font-bold text-white/40 group-hover:text-white transition-colors">{new Date(user?.created_at || '').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Изменение Email */}
        <div className="bg-black/40 border border-white/5 rounded-[40px] p-10">
          <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-8 border-b border-white/5 pb-6">Update Email</h2>
          <form onSubmit={handleUpdateEmail} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-2 ml-4">
                New Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white transition-all font-medium"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Change Email'}
            </button>
          </form>
        </div>

        {/* Изменение пароля */}
        <div className="bg-black/40 border border-white/5 rounded-[40px] p-10">
          <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-8 border-b border-white/5 pb-6">Security Authorization</h2>
          <form onSubmit={handleChangePassword} className="space-y-6">
            <div>
              <label htmlFor="current-password" className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-2 ml-4">
                Current Password
              </label>
              <input
                type="password"
                id="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white transition-all font-medium"
                required
              />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
               <div>
                  <label htmlFor="new-password" className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-2 ml-4">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white transition-all font-medium"
                    required
                    minLength={8}
                  />
               </div>
               <div>
                  <label htmlFor="confirm-password" className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-2 ml-4">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white transition-all font-medium"
                    required
                  />
               </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-indigo-500 transition-all shadow-[0_0_30px_rgba(79,70,229,0.3)] disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Update Security'}
            </button>
          </form>
        </div>

        {/* Удаление аккаунта */}
        <div className="mt-8 p-10 bg-red-500/5 border border-red-500/10 rounded-[40px]">
          <h2 className="text-sm font-black text-red-400 uppercase tracking-[0.2em] mb-4">Danger Zone</h2>
          <p className="text-xs text-white/30 mb-8 uppercase tracking-widest font-medium leading-relaxed">
            Deleting your account is permanent. All your data, balance, and history will be wiped from our servers.
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={loading}
            className="px-8 py-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500/20 transition-all disabled:opacity-50"
          >
            Terminal Account
          </button>
        </div>
      </div>
    </div>
  );
}

