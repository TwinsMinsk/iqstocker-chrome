'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api/client';

// Интерфейс для транзакции
interface Transaction {
  id: string;
  amount_eur: number;
  credits_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  plan_name?: string;
}

export default function PaymentHistoryPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadTransactions();
  }, [isAuthenticated, router]);

  const loadTransactions = async () => {
    try {
      // TODO: Подключить реальный API endpoint
      // const response = await api.get('/transactions');
      // setTransactions(response.data.transactions);
      
      // Mock data для демонстрации
      setTimeout(() => {
        setTransactions([
          {
            id: '1',
            amount_eur: 10,
            credits_amount: 5000,
            status: 'completed',
            payment_method: 'telegram_tribute',
            created_at: '2025-12-20T10:30:00Z',
            plan_name: 'STANDARD',
          },
          {
            id: '2',
            amount_eur: 3,
            credits_amount: 1000,
            status: 'completed',
            payment_method: 'telegram_tribute',
            created_at: '2025-12-15T14:20:00Z',
            plan_name: 'BASIC',
          },
          {
            id: '3',
            amount_eur: 17,
            credits_amount: 10000,
            status: 'pending',
            payment_method: 'telegram_tribute',
            created_at: '2025-12-23T09:15:00Z',
            plan_name: 'PRO',
          },
        ]);
        setLoading(false);
      }, 500);
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
      completed: 'Completed',
      pending: 'Pending',
      failed: 'Failed',
      refunded: 'Refunded',
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
        <h1 className="text-xs font-black tracking-[0.3em] text-indigo-500 uppercase mb-2">Ledger</h1>
        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none">
          Payment <span className="text-white/20 tracking-normal italic">History</span>
        </h2>
      </header>

      {transactions.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-[40px] p-20 text-center">
          <div className="text-indigo-500 text-6xl mb-8 opacity-20">💳</div>
          <h3 className="text-2xl font-black mb-4 text-white uppercase tracking-tighter">
            No transactions found
          </h3>
          <p className="text-white/30 mb-10 max-w-sm mx-auto font-light leading-relaxed">
            Your payment history is empty. Purchase a plan to start your automation journey.
          </p>
          <Link
            href="/dashboard/billing"
            className="inline-block px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-[0_0_30px_rgba(79,70,229,0.3)]"
          >
            Purchase Plan
          </Link>
        </div>
      ) : (
        <div className="bg-black/40 border border-white/10 rounded-[40px] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  <th className="px-8 py-6 text-left text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Date</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Plan</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Credits</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Amount</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Status</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-6 text-xs font-bold text-white/60 uppercase font-mono">
                      {formatDate(transaction.created_at)}
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-black text-white uppercase tracking-widest">{transaction.plan_name}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-black text-indigo-400">+{transaction.credits_amount.toLocaleString()}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-black text-white">€{transaction.amount_eur.toFixed(2)}</span>
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
        <p className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.2em]">
          Support: help@iqstocker.auto
        </p>
        <div className="flex gap-4">
           <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>
           <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Ledger Active</span>
        </div>
      </div>
    </div>
  );
}

