'use client';

import { useState } from 'react';
import { promoAPI } from '@/services/api/promo';
import { useAuthStore } from '@/store/authStore';

export default function PromoCodeInput() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const { fetchUser } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const response = await promoAPI.redeemPromo({ code: code.trim() });
      setStatus('success');
      setMessage(response.message || `Успешно! Начислено ${response.credits_added} кредитов`);
      setCode('');
      // Обновляем баланс пользователя
      fetchUser();
      
      // Сбрасываем статус через некоторое время
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 5000);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.response?.data?.detail || 'Ошибка активации промокода');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-12">
       <div className="relative group">
         {/* Свечение */}
         <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-indigo-500/20 rounded-[32px] blur-xl opacity-0 group-hover:opacity-100 transition duration-1000"></div>
         
         <div className="relative bg-[#0c0c0e] border border-white/5 rounded-[32px] p-8 md:p-10 backdrop-blur-xl overflow-hidden">
            {/* Декоративные элементы */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
              <div className="flex-1 w-full">
                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                  <span className="w-1 h-1 bg-indigo-500 rounded-full"></span>
                  Промокод
                </h3>
                
                <form onSubmit={handleSubmit} className="relative">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      if (status !== 'idle') setStatus('idle');
                    }}
                    placeholder="ВВЕДИТЕ ПРОМОКОД"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all uppercase tracking-wider"
                    disabled={loading}
                  />
                  
                  <button
                    type="submit"
                    disabled={loading || !code.trim()}
                    className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      'Применить'
                    )}
                  </button>
                </form>

                {/* Сообщения о статусе */}
                {status !== 'idle' && (
                  <div className={`mt-4 text-xs font-bold flex items-center gap-2 animate-fade-in ${
                    status === 'success' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {status === 'success' ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {message}
                  </div>
                )}
              </div>

              {/* Иконка */}
              <div className="hidden md:flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 rotate-3 group-hover:rotate-6 transition-transform duration-500">
                <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
            </div>
         </div>
       </div>
    </div>
  );
}

