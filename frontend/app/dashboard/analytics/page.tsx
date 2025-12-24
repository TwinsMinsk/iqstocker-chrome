'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

// Интерфейс для статистики
interface UsageStats {
  total_prompts: number;
  successful: number;
  failed: number;
  last_7_days: Array<{
    date: string;
    count: number;
  }>;
}

export default function AnalyticsPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Загрузка статистики
    // TODO: Подключить реальный API endpoint
    setTimeout(() => {
      setStats({
        total_prompts: 1250,
        successful: 1180,
        failed: 70,
        last_7_days: [
          { date: '2025-12-17', count: 150 },
          { date: '2025-12-18', count: 200 },
          { date: '2025-12-19', count: 180 },
          { date: '2025-12-20', count: 220 },
          { date: '2025-12-21', count: 190 },
          { date: '2025-12-22', count: 160 },
          { date: '2025-12-23', count: 150 },
        ],
      });
      setLoading(false);
    }, 500);
  }, [isAuthenticated, router]);

  if (!isAuthenticated || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-500">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const successRate = ((stats.successful / stats.total_prompts) * 100).toFixed(1);
  const maxCount = Math.max(...stats.last_7_days.map(d => d.count));

  return (
    <div className="container mx-auto px-4 py-12">
      <header className="mb-12">
        <h1 className="text-xs font-black tracking-[0.3em] text-indigo-500 uppercase mb-2">Метрики</h1>
        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase">
          Аналитика <span className="text-white/20 tracking-normal italic">использования</span>
        </h2>
      </header>

      {/* Общая статистика */}
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4">Всего промптов</div>
          <div className="text-5xl font-black text-white tracking-tighter">
            {stats.total_prompts.toLocaleString()}
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -z-10"></div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4">Успешно</div>
          <div className="text-5xl font-black text-green-400 tracking-tighter">
            {stats.successful.toLocaleString()}
          </div>
          <div className="text-[10px] font-bold text-green-400/40 mt-2 uppercase tracking-widest">
            {successRate}% Эффективность
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4">Ошибка</div>
          <div className="text-5xl font-black text-red-400 tracking-tighter">
            {stats.failed.toLocaleString()}
          </div>
        </div>
      </div>

      {/* График за последние 7 дней */}
      <div className="bg-black/40 border border-white/10 rounded-[40px] p-10 shadow-2xl">
        <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-10 border-b border-white/5 pb-6">Активность (последние 7 дней)</h3>
        
        <div className="space-y-6">
          {stats.last_7_days.map((day) => {
            const percentage = (day.count / maxCount) * 100;
            const date = new Date(day.date);
            const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short' });
            const dayDate = date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
            
            return (
              <div key={day.date} className="flex items-center gap-6">
                <div className="w-24">
                  <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 leading-none mb-1">{dayName}</div>
                  <div className="text-xs font-bold text-white/20 uppercase tracking-tighter leading-none">{dayDate}</div>
                </div>
                <div className="flex-1 bg-white/5 rounded-2xl h-10 relative overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-2xl flex items-center justify-end pr-4 transition-all duration-1000 shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                    style={{ width: `${percentage}%` }}
                  >
                    {percentage > 15 && (
                      <span className="text-white font-black text-[10px] uppercase tracking-widest">
                        {day.count}
                      </span>
                    )}
                  </div>
                </div>
                {percentage <= 15 && (
                  <div className="w-12 text-right text-xs font-black text-white tracking-widest">
                    {day.count}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Дополнительная информация */}
      <div className="mt-12 p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">💡</div>
        <p className="text-xs font-bold text-indigo-400/60 uppercase tracking-[0.1em]">
          Подробные журналы сессий доступны в панели управления администратора.
        </p>
      </div>
    </div>
  );
}

