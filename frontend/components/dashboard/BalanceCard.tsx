'use client';

import { useQuery } from '@tanstack/react-query';
import { billingAPI } from '@/services/api/billing';
import Link from 'next/link';

export function BalanceCard() {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => billingAPI.getMySubscription(),
  });

  if (isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden group animate-pulse h-full">
        <div className="h-4 bg-white/10 rounded w-1/4 mb-4"></div>
        <div className="h-12 bg-white/10 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-10 md:p-12 relative overflow-hidden group h-full flex flex-col">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
         <svg className="w-48 h-48 md:w-64 md:h-64 text-indigo-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.82v-1.91c-1.57-.22-3.08-.85-4.22-1.78l1.45-2.22c1.03.73 2.19 1.15 3.31 1.15 1.14 0 1.7-.5 1.7-1.14 0-.67-.5-1.07-1.92-1.42-2.17-.55-4.26-1.34-4.26-3.8 0-2.11 1.63-3.56 3.94-3.89V4h2.82v1.92c1.37.19 2.53.66 3.48 1.25l-1.31 2.21c-.81-.46-1.72-.81-2.73-.81-1.05 0-1.57.51-1.57 1.05 0 .63.63.98 2.05 1.35 2.5.64 4.14 1.7 4.14 3.84 0 2.26-1.74 3.65-4.08 4.07z"/></svg>
      </div>
      <h3 className="text-sm font-black tracking-[0.2em] text-white/40 uppercase mb-10">Текущий баланс</h3>
      <div className="flex items-baseline gap-4 flex-1 justify-center">
         <span className="text-8xl md:text-9xl font-black text-white tracking-tighter leading-none">
           {subscription?.credits_balance?.toLocaleString() || 0}
         </span>
         <span className="text-indigo-400 font-bold text-2xl md:text-3xl tracking-widest uppercase">Кредитов</span>
      </div>
      <div className="mt-auto pt-8 border-t border-white/5 flex items-center justify-between">
         <span className="text-sm text-white/30 font-bold uppercase tracking-widest">Статус: Готов</span>
         <Link 
            href="/dashboard/billing" 
            className="text-sm font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest"
         >
            Пополнить →
         </Link>
      </div>
    </div>
  );
}


