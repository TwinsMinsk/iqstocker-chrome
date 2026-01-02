'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { billingAPI, type Plan } from '@/services/api/billing';

// Дефолтные планы на случай если API не вернет данные
const DEFAULT_PLANS: Plan[] = [
  { id: 'credit_500', name: '500 Credits', price_eur: 2, credits: 500, duration_days: 365, description: '' },
  { id: 'credit_2500', name: '2500 Credits', price_eur: 9, credits: 2500, duration_days: 365, description: '' },
  { id: 'credit_5000', name: '5000 Credits', price_eur: 16, credits: 5000, duration_days: 365, description: '' },
  { id: 'credit_10000', name: '10000 Credits', price_eur: 24, credits: 10000, duration_days: 365, description: '' },
];

export default function BillingPage() {
  const { isAuthenticated, user, fetchUser, isHydrated } = useAuthStore();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS); // Сразу ставим дефолтные
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>('credit_500'); // Дефолтный выбор

  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadPlans();
    fetchUser(); // Обновляем данные пользователя (баланс)
  }, [isAuthenticated, router, fetchUser, isHydrated]);

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

  if (!isHydrated || !isAuthenticated) {
    return null; // Ждем редиректа
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {loading && !plans.length ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-500 font-black uppercase tracking-widest animate-pulse">Загрузка...</div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-8">
              Забудьте про ежемесячные подписки
            </h2>
            
            <div className="inline-block text-left space-y-4 mb-16">
              {[
                'Покупайте столько кредитов, сколько Вам нужно',
                'Без ежемесячных платежей и автосписаний',
                'Пополняйте баланс в любое время',
                'Кредиты можно использовать без ограничения по времени',
                'Чем больше кредитов покупаете - тем выгоднее цена',
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-4 text-base md:text-lg font-medium text-white/90">
                  <div className="flex-shrink-0 w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  {text}
                </div>
              ))}
            </div>

            {/* Credit Selector Card */}
            <div className="relative group max-w-xl mx-auto">
              {/* Animated glow border */}
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-500 rounded-[40px] blur-xl opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              
              <div className="relative bg-[#0a0a0c] rounded-[38px] p-8 md:p-12 border border-white/10 shadow-2xl backdrop-blur-xl">
                <h3 className="text-indigo-400 font-bold uppercase tracking-widest text-xs mb-3">
                  Выберите сколько кредитов Вам нужно
                </h3>
                <p className="text-white/60 text-xs mb-10">
                  1 кредит = 1 отправленный промпт
                </p>

                {/* Credit Buttons Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                  {plans.map((plan) => {
                    const discount = plan.id === 'credit_2500' ? '-10%' : 
                                    plan.id === 'credit_5000' ? '-20%' : 
                                    plan.id === 'credit_10000' ? '-40%' : null;
                    return (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`relative py-4 px-2 rounded-2xl border transition-all font-black text-xl flex flex-col items-center justify-center ${
                          selectedPlanId === plan.id
                            ? 'bg-indigo-600/10 border-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.2)]'
                            : 'bg-white/5 border-white/10 text-white/30 hover:border-white/20 hover:text-white/50'
                        }`}
                      >
                        {plan.credits}
                        {discount && (
                          <span className={`absolute -top-2 -right-2 ${
                            plan.id === 'credit_2500' ? 'bg-blue-500' : 
                            plan.id === 'credit_5000' ? 'bg-cyan-500' : 
                            plan.id === 'credit_10000' ? 'bg-purple-500' : 
                            'bg-orange-500'
                          } text-white text-[9px] px-2 py-0.5 rounded-full transform rotate-12 font-black shadow-lg`}>
                            {discount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mb-12">
                  <div className="text-white/40 text-xs font-black uppercase tracking-[0.2em] mb-3">Стоимость</div>
                  <div className="text-7xl font-black text-white tracking-tighter">
                    {selectedPlan?.price_eur.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} <span className="text-3xl ml-1 text-white/50 tracking-normal">€</span>
                  </div>
                </div>

                <button
                  onClick={handlePurchase}
                  disabled={purchasing !== null}
                  className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black py-6 rounded-2xl text-xl transition-all shadow-[0_10px_40px_rgba(79,70,229,0.3)] hover:shadow-[0_15px_50px_rgba(79,70,229,0.4)] active:scale-[0.98] disabled:opacity-50"
                >
                  {purchasing ? 'ОБРАБОТКА...' : 'Купить кредиты'}
                </button>
                
                <p className="mt-6 text-[10px] text-white/20 font-bold uppercase tracking-widest text-center">
                  Нажимая кнопку «Купить кредиты», вы соглашаетесь<br />
                  с{' '}
                  <Link href="/offer" className="text-white/40 hover:text-white/60 underline">
                    условиями Оферты
                  </Link>
                </p>
              </div>
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


