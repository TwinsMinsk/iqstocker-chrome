'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { billingAPI, type Plan } from '@/services/api/billing';

// Дефолтные планы на случай если API не вернет данные
const DEFAULT_PLANS: Plan[] = [
  { id: 'credit_500', name: '500 Credits', price_eur: 1.05, credits: 500, duration_days: 365, description: '' },
  { id: 'credit_1000', name: '1000 Credits', price_eur: 1.68, credits: 1000, duration_days: 365, description: '' },
  { id: 'credit_2000', name: '2000 Credits', price_eur: 3.36, credits: 2000, duration_days: 365, description: '' },
  { id: 'credit_5000', name: '5000 Credits', price_eur: 6.30, credits: 5000, duration_days: 365, description: '' },
];

export default function BillingPage() {
  const { isAuthenticated, user, fetchUser } = useAuthStore();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS); // Сразу ставим дефолтные
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>('credit_500'); // Дефолтный выбор

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadPlans();
    fetchUser(); // Обновляем данные пользователя (баланс)
  }, [isAuthenticated, router, fetchUser]);

  const loadPlans = async () => {
    try {
      const data = await billingAPI.getPlans();
      if (Array.isArray(data) && data.length > 0) {
        const sortedPlans = data.sort((a: Plan, b: Plan) => a.credits - b.credits);
        setPlans(sortedPlans);
        // Если текущий выбранный ID не входит в новые планы, выбираем первый
        if (!sortedPlans.find(p => p.id === selectedPlanId)) {
          setSelectedPlanId(sortedPlans[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load plans:', error);
      // Если ошибка, оставляем дефолтные планы
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!user || !selectedPlanId) return;

    setPurchasing(selectedPlanId);
    try {
      const response = await billingAPI.purchasePlan({ plan_id: selectedPlanId });
      
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

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || plans[0];

  if (!isAuthenticated) {
    return null; // Ждем редиректа
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {loading && !plans.length ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-500 font-black uppercase tracking-widest animate-pulse">Загрузка...</div>
        </div>
      ) : (
        <div className="text-center mb-12">
        <div className="flex flex-col items-center space-y-4 mb-20">
          {[
            'Покупай столько кредитов, сколько тебе нужно',
            'Без ежемесячных платежей и автосписаний',
            'Пополняй баланс в любое время',
            'Кредиты можно использовать без ограничения по времени',
            'Чем больше кредитов покупаешь - тем выгоднее цена',
          ].map((text, i) => (
            <div key={i} className="flex items-center gap-4 text-base md:text-lg font-medium text-white/90">
              <div className="flex-shrink-0 w-6 h-6 rounded-md bg-green-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {text}
            </div>
          ))}
        </div>

        {/* Селектор кредитов */}
        <div className="relative group max-w-xl mx-auto">
          {/* Свечение сзади */}
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 rounded-[40px] blur-2xl opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
          
          <div className="relative bg-[#0a0a0c] rounded-[40px] p-8 md:p-14 border border-white/10 shadow-2xl backdrop-blur-xl">
            <h3 className="text-[#848aff] font-black uppercase tracking-[0.3em] text-[10px] mb-14">
              ВЫБЕРИ СКОЛЬКО КРЕДИТОВ ТЕБЕ НУЖНО
            </h3>

            {/* Сетка кнопок выбора */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-20">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`relative h-16 rounded-2xl border transition-all font-black text-2xl flex items-center justify-center ${
                    selectedPlanId === plan.id
                      ? 'bg-indigo-600/10 border-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]'
                      : 'bg-white/5 border-white/5 text-[#333333] hover:border-white/10 hover:text-white/40'
                  }`}
                >
                  {plan.credits}
                  {(plan.id === 'credit_1000' || plan.id === 'credit_2000') && (
                    <span className="absolute -top-3 -right-3 bg-[#ff6b00] text-white text-[10px] px-2.5 py-1 rounded-full transform rotate-12 font-black shadow-lg">
                      -20%
                    </span>
                  )}
                  {plan.id === 'credit_5000' && (
                    <span className="absolute -top-3 -right-3 bg-[#ff0000] text-white text-[10px] px-2.5 py-1 rounded-full transform rotate-12 font-black shadow-lg">
                      -40%
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="mb-14">
              <div className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mb-4">СТОИМОСТЬ</div>
              <div className="text-8xl font-black text-white tracking-tighter flex items-center justify-center gap-4">
                {selectedPlan?.price_eur.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                <span className="text-4xl text-white/40 font-black tracking-normal">€</span>
              </div>
            </div>

            <button
              onClick={handlePurchase}
              disabled={purchasing !== null}
              className="w-full bg-gradient-to-r from-[#5a46e5] to-[#a846e5] hover:brightness-110 text-white font-black py-7 rounded-3xl text-2xl transition-all shadow-[0_15px_50px_rgba(110,70,229,0.4)] active:scale-[0.98] disabled:opacity-50"
            >
              {purchasing ? 'ОБРАБОТКА...' : 'Купить кредиты'}
            </button>
            
            <p className="mt-10 text-[10px] text-white/10 font-black uppercase tracking-[0.4em]">
              МГНОВЕННОЕ НАЧИСЛЕНИЕ • БЕЗ СКРЫТЫХ КОМИССИЙ
            </p>
          </div>
        </div>
        </div>
      )}

      {/* Текущий баланс */}
      <div className="mt-24 flex flex-col items-center">
        <div className="bg-[#0c0c0e] border border-white/5 rounded-[32px] p-10 px-16 flex items-center gap-16 backdrop-blur-xl">
          <div className="flex flex-col">
            <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-3">ВАШ ТЕКУЩИЙ БАЛАНС</div>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-black text-white tracking-tighter">
                {user?.balance?.credits || 0}
              </span>
              <span className="text-xs font-black text-white/10 uppercase tracking-[0.3em]">КРЕДИТОВ</span>
            </div>
          </div>
          <div className="w-px h-16 bg-white/5"></div>
          <Link
            href="/dashboard/payment-history"
            className="text-[10px] font-black text-[#5a46e5] hover:text-[#7a66ff] uppercase tracking-[0.4em] transition-all flex items-center gap-2 group"
          >
            ИСТОРИЯ ТРАНЗАКЦИЙ 
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}


