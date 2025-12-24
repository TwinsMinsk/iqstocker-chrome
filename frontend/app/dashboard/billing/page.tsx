'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { billingAPI } from '@/services/api/billing';

// Интерфейс для плана подписки
interface Plan {
  id: string;
  name: string;
  price_eur: number;
  credits: number;
  duration_days: number;
  is_popular?: boolean;
}

export default function BillingPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadPlans();
  }, [isAuthenticated, router]);

  const loadPlans = async () => {
    try {
      const response = await billingAPI.getPlans();
      setPlans(response.plans);
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (planId: string) => {
    if (!user) return;

    setPurchasing(planId);
    try {
      const response = await billingAPI.purchasePlan(planId);
      
      // Перенаправление на страницу оплаты Telegram Tribute
      if (response.payment_url) {
        window.open(response.payment_url, '_blank');
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Ошибка при создании платежа');
    } finally {
      setPurchasing(null);
    }
  };

  if (!isAuthenticated || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-500">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <header className="mb-12">
        <h1 className="text-xs font-black tracking-[0.3em] text-indigo-500 uppercase mb-2">Оплата</h1>
        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none">
          Купить <span className="text-white/20 tracking-normal italic">Кредиты</span>
        </h2>
      </header>

      {/* Текущий баланс */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-900 text-white rounded-[40px] shadow-2xl p-10 mb-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] opacity-60 mb-2">Доступный баланс</div>
            <div className="text-6xl font-black tracking-tighter">
              {user?.balance?.toLocaleString() || 0} <span className="text-lg opacity-40 uppercase tracking-widest ml-2">Кредитов</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-black uppercase tracking-[0.2em] opacity-60 mb-2">Текущий уровень</div>
            <div className="text-2xl font-black tracking-widest uppercase px-6 py-2 bg-black/20 rounded-full border border-white/10">
              {user?.subscription_tier === 'FREE' ? 'БЕСПЛАТНЫЙ' : user?.subscription_tier || 'БЕСПЛАТНЫЙ'}
            </div>
          </div>
        </div>
      </div>

      {/* Планы подписки */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-[40px] p-10 border transition-all duration-500 hover:scale-[1.02] ${
              plan.is_popular 
                ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_50px_rgba(79,70,229,0.3)]' 
                : 'bg-white/5 border-white/10'
            }`}
          >
            {plan.is_popular && (
              <div className="bg-white text-indigo-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-8 inline-block shadow-xl">
                Самый популярный
              </div>
            )}

            <h3 className={`text-sm font-black mb-2 tracking-widest uppercase ${plan.is_popular ? 'text-white' : 'text-indigo-400'}`}>
              {plan.name}
            </h3>
            <div className="flex items-baseline gap-1 mb-8">
               <span className="text-5xl font-black tracking-tighter text-white">€{plan.price_eur}</span>
               <span className={`text-xs uppercase tracking-widest ${plan.is_popular ? 'text-white/60' : 'text-white/20'}`}>Разово</span>
            </div>
            
            <p className={`text-sm font-medium mb-10 ${plan.is_popular ? 'text-white/80' : 'text-white/40'}`}>
              {plan.credits.toLocaleString()} Промптов на {plan.duration_days} дней использования.
            </p>

            <ul className="space-y-4 mb-12">
              {[
                `${plan.credits.toLocaleString()} Кредитов`,
                'Автоматическая обработка',
                plan.is_popular ? 'Приоритетная поддержка' : 'Стандартная поддержка',
                plan.price_eur > 5 ? `Экономия ${Math.round((1 - (plan.price_eur / plan.credits * 1000)) / 0.03 * 100)}%` : null
              ].filter(Boolean).map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest">
                  <div className={`w-1.5 h-1.5 rounded-full ${plan.is_popular ? 'bg-white' : 'bg-indigo-500'}`}></div>
                  <span className={plan.is_popular ? 'text-white' : 'text-white/60'}>{item}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handlePurchase(plan.id)}
              disabled={purchasing === plan.id}
              className={`w-full py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.3em] transition-all ${
                plan.is_popular
                  ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                  : 'bg-white/10 text-white hover:bg-white/20'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {purchasing === plan.id ? 'Загрузка...' : 'Выбрать тариф'}
            </button>
          </div>
        ))}
      </div>

      {/* Информация об оплате */}
      <div className="bg-black/40 border border-white/5 rounded-[40px] p-12">
        <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-10 border-b border-white/5 pb-6 text-center">Информация об оплате</h3>
        <div className="grid md:grid-cols-2 gap-12 text-center md:text-left">
           <div>
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Безопасная оплата</h4>
              <p className="text-xs text-white/30 font-medium leading-relaxed uppercase tracking-widest">
                Все транзакции обрабатываются через Telegram Tribute API. 
                Зашифровано и децентрализовано для вашей конфиденциальности.
              </p>
           </div>
           <div>
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Мгновенное начисление</h4>
              <p className="text-xs text-white/30 font-medium leading-relaxed uppercase tracking-widest">
                Кредиты добавляются на ваш баланс сразу после подтверждения оплаты. 
                Ручное одобрение не требуется.
              </p>
           </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex justify-center">
          <Link
            href="/dashboard/payment-history"
            className="text-[10px] font-black text-white/20 hover:text-white uppercase tracking-[0.3em] transition-colors"
          >
            Просмотреть историю транзакций →
          </Link>
        </div>
      </div>
    </div>
  );
}

