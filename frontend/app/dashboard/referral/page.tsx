'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { usersAPI, ReferralStatsResponse } from '@/services/api/users';

export default function ReferralPage() {
  const [stats, setStats] = useState<ReferralStatsResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user, isHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchStats();
  }, [isAuthenticated, router, isHydrated]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await usersAPI.getReferralStats();
      // Если referral_code отсутствует, это нормально для старых пользователей
      // Backend автоматически сгенерирует его при следующем запросе
      setStats(data);
    } catch (error: any) {
      console.error('Failed to fetch referral stats', error);
      // Показываем более понятное сообщение об ошибке
      if (error.response?.status === 404) {
        console.error('Referral endpoint not found. Make sure backend is deployed with latest changes.');
      } else if (error.response?.status === 401) {
        // Пользователь не аутентифицирован - редирект уже обработан в useEffect
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (stats?.referral_code) {
      const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${stats.referral_code}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isHydrated || !isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-12 pb-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-gray-500 font-black uppercase tracking-widest animate-pulse">Загрузка...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen pt-12 pb-20">
        <div className="container mx-auto px-4">
          <div className="text-center text-white/40">Не удалось загрузить статистику</div>
        </div>
      </div>
    );
  }

  // Если referral_code отсутствует, показываем сообщение о генерации
  const referralLink = stats.referral_code 
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${stats.referral_code}`
    : '';

  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <header className="mb-12">
          <h1 className="text-xs font-black tracking-[0.3em] text-indigo-500 uppercase mb-2">Реферальная программа</h1>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
            Получайте <span className="text-indigo-400">20%</span><br/>
            от покупок ваших друзей
          </h2>
        </header>

        {/* Ваша ссылка */}
        <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 md:p-12 mb-8 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -z-10"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 blur-3xl -z-10"></div>

          <h2 className="text-lg font-black uppercase tracking-[0.2em] text-white/80 mb-6">Ваша пригласительная ссылка</h2>
          {stats.referral_code ? (
            <>
              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="flex-1 px-6 py-4 bg-black/40 border border-white/20 rounded-2xl text-white/80 text-sm font-medium"
                />
                <button
                  onClick={copyLink}
                  className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-colors disabled:opacity-50"
                >
                  {copied ? '✓ Скопировано' : 'Копировать'}
                </button>
              </div>
              <p className="text-white/40 text-xs font-medium uppercase tracking-widest">
                Поделитесь ссылкой с друзьями и получайте 20% с каждой их покупки!
              </p>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-white/60 text-sm mb-4">Реферальный код генерируется...</p>
              <button
                onClick={fetchStats}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium text-sm transition-colors"
              >
                Обновить
              </button>
            </div>
          )}
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 text-center backdrop-blur-xl">
            <div className="text-5xl font-black text-indigo-400 mb-3">{stats.invited_count}</div>
            <div className="text-white/50 text-xs font-black uppercase tracking-[0.2em]">Приглашено друзей</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 text-center backdrop-blur-xl">
            <div className="text-5xl font-black text-green-400 mb-3">{stats.total_earned_credits}</div>
            <div className="text-white/50 text-xs font-black uppercase tracking-[0.2em]">Заработано кредитов</div>
          </div>
        </div>

        {/* Информация о программе */}
        <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 backdrop-blur-xl">
          <h3 className="text-lg font-black uppercase tracking-[0.2em] text-white/80 mb-6">Как это работает</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <span className="text-indigo-400 font-black text-sm">1</span>
              </div>
              <div>
                <p className="text-white/80 font-medium mb-1">Поделитесь своей ссылкой</p>
                <p className="text-white/40 text-sm">Скопируйте ссылку выше и отправьте её друзьям</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <span className="text-indigo-400 font-black text-sm">2</span>
              </div>
              <div>
                <p className="text-white/80 font-medium mb-1">Друг регистрируется</p>
                <p className="text-white/40 text-sm">Ваш друг переходит по ссылке и создает аккаунт</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <span className="text-indigo-400 font-black text-sm">3</span>
              </div>
              <div>
                <p className="text-white/80 font-medium mb-1">Получайте бонусы</p>
                <p className="text-white/40 text-sm">Когда друг покупает кредиты, вы получаете <span className="text-indigo-400">20% от каждой его покупки</span> в виде бонусных кредитов на свой баланс. Реферал закрепляется за вами бессрочно</p>
              </div>
            </div>
          </div>
        </div>

        {/* Пример */}
        <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 backdrop-blur-xl mt-8">
          <h3 className="text-lg font-black uppercase tracking-[0.2em] text-white/80 mb-6">Пример</h3>
          <div className="space-y-4 text-white/80 text-sm leading-relaxed">
            <p>
              Вы поделились своей ссылкой с другом.<br/>
              Друг зарегистрировался и купил 5000 кредитов.
            </p>
            <p>
              На ваш баланс сразу зачисляется 1000 бонусных кредитов - это обычные кредиты, которыми можно пользоваться без ограничений.
            </p>
            <p>
              Дальше система работает автоматически:<br/>
              каждая новая покупка этого друга приносит вам <span className="text-indigo-400">20% от купленных им кредитов</span>.
            </p>
            <p>
              Ограничений по времени нет.<br/>
              Друг остаётся вашим рефералом бессрочно, и бонусы начисляются всё время, пока он пользуется сервисом и покупает кредиты.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

