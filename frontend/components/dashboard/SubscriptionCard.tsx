'use client';

import { useQuery } from '@tanstack/react-query';
import { billingAPI } from '@/services/api/billing';

export function SubscriptionCard() {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => billingAPI.getMySubscription(),
  });

  if (isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden group animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-white/10 rounded w-1/2"></div>
      </div>
    );
  }

  const planNames: Record<string, string> = {
    free: 'БЕСПЛАТНЫЙ',
    plan_basic: 'БАЗОВЫЙ',
    plan_standard: 'СТАНДАРТНЫЙ',
    plan_pro: 'ПРО',
  };

  const planName = planNames[subscription?.plan_id || 'free'] || 'БЕСПЛАТНЫЙ';
  const isFree = planName === 'БЕСПЛАТНЫЙ';

  return (
    <div className={`rounded-3xl p-8 border transition-all duration-300 ${
      isFree 
        ? 'bg-white/5 border-white/10' 
        : 'bg-indigo-600 border-indigo-400 shadow-[0_0_40px_rgba(79,70,229,0.3)]'
    }`}>
      <h3 className={`text-xs font-black tracking-[0.2em] uppercase mb-8 ${
        isFree ? 'text-white/30' : 'text-white/60'
      }`}>Тарифный план</h3>
      
      <div className="flex items-center justify-between mb-8">
         <span className="text-4xl font-black text-white tracking-tighter uppercase">{planName}</span>
         <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
            subscription?.status === 'active' 
              ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
         }`}>
            {subscription?.status === 'active' ? 'Активен' : 'Неактивен'}
         </span>
      </div>

      <div className={`pt-6 border-t ${isFree ? 'border-white/5' : 'border-white/20'}`}>
         {subscription?.subscription_expires_at && (
            <div className={`text-[10px] uppercase tracking-widest font-bold mb-4 ${isFree ? 'text-white/20' : 'text-white/60'}`}>
              Истекает: {new Date(subscription.subscription_expires_at).toLocaleDateString('ru-RU')}
            </div>
         )}
         <button className={`w-full py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all ${
           isFree 
            ? 'bg-white/10 text-white hover:bg-white/20' 
            : 'bg-white text-indigo-600 hover:bg-indigo-50'
         }`}>
            {isFree ? 'Улучшить тариф' : 'Управление подпиской'}
         </button>
      </div>
    </div>
  );
}


