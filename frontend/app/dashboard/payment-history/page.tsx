'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api/client';

// Интерфейс для транзакции
interface Transaction {
  id: string;
  amount: number;
  credits: number;
  status: string;
  created_at: string;
  plan_id?: string;
}

export default function PaymentHistoryPage() {
  const { isAuthenticated, isHydrated } = useAuthStore();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadTransactions();
  }, [isAuthenticated, router, isHydrated]);

  const loadTransactions = async () => {
    try {
      const response = await api.get('/subscriptions/transactions');
      setTransactions(response.data.transactions);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-500/10 text-green-400 border-green-500/20',
      pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      failed: 'bg-red-500/10 text-red-400 border-red-500/20',
      refunded: 'bg-gray-500/10 text-white/40 border-white/10',
    };

    const labels = {
      completed: 'Завершено',
      pending: 'В ожидании',
      failed: 'Ошибка',
      refunded: 'Возврат',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isHydrated || !isAuthenticated || loading) {
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
        <h1 className="text-xs font-black tracking-[0.3em] text-indigo-500 uppercase mb-2">Журнал</h1>
        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none">
          История <span className="text-white/20 tracking-normal italic">платежей</span>
        </h2>
      </header>

      {transactions.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-[40px] p-20 text-center">
          <div className="text-indigo-500 text-6xl mb-8 opacity-20">💳</div>
          <h3 className="text-2xl font-black mb-4 text-white uppercase tracking-tighter">
            Транзакции не найдены
          </h3>
          <p className="text-white/30 mb-10 max-w-sm mx-auto font-light leading-relaxed">
            Ваша история платежей пуста. Купите тариф, чтобы начать автоматизацию.
          </p>
          <Link
            href="/dashboard/billing"
            className="inline-block px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-[0_0_30px_rgba(79,70,229,0.3)]"
          >
            Купить тариф
          </Link>
        </div>
      ) : (
        <div className="bg-black/40 border border-white/10 rounded-[40px] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  <th className="px-8 py-6 text-left text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Дата</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Тариф</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Кредиты</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Сумма</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Статус</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-6 text-xs font-bold text-white/60 uppercase font-mono">
                      {formatDate(transaction.created_at)}
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-black text-white uppercase tracking-widest">
                        {transaction.plan_id === 'credit_5000' ? 'СТАНДАРТНЫЙ' : 
                         transaction.plan_id === 'credit_2500' ? 'БАЗОВЫЙ' : 
                         transaction.plan_id === 'credit_10000' ? 'ПРО' : 
                         transaction.plan_id === 'credit_500' ? 'СТАРТ' :
                         transaction.plan_id?.replace('credit_', '') || 'Custom'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-black text-indigo-400">+{transaction.credits.toLocaleString()}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-black text-white">€{Number(transaction.amount).toFixed(2)}</span>
                    </td>
                    <td className="px-8 py-6">
                      {getStatusBadge(transaction.status)}
                    </td>
                    <td className="px-8 py-6 text-[10px] text-white/20 font-mono">
                      {transaction.id.substring(0, 12).toUpperCase()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Информационная панель */}
      <div className="mt-12 p-8 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl flex items-center justify-between">
        <div className="flex gap-4 items-center">
           <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>
           <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Журнал активен</span>
        </div>
      </div>
    </div>
  );
}

