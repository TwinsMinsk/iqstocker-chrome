'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAPI, type DashboardStats } from '@/services/api/admin';

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [activeMetric, setActiveMetric] = useState<'dau' | 'wau' | 'mau'>('mau'); // Переключатель DAU/WAU/MAU

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-analytics', days, isCustomDate, dateRange],
    queryFn: () => {
      if (isCustomDate) {
        return adminAPI.getDashboardStats({
          start_date: dateRange.start,
          end_date: dateRange.end,
        });
      }
      return adminAPI.getDashboardStats(days);
    },
  });

  const handlePeriodChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomDate(true);
    } else {
      setIsCustomDate(false);
      setDays(Number(value));
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatPercent = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Аналитика</h2>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Период:</label>
            <select
              value={isCustomDate ? 'custom' : days}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-semibold"
            >
              <option value={7}>7 дней</option>
              <option value={30}>30 дней</option>
              <option value={90}>90 дней</option>
              <option value={180}>180 дней</option>
              <option value={365}>365 дней</option>
              <option value="custom">Произвольный</option>
            </select>
          </div>
          
          {isCustomDate && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-2 py-1 border border-gray-300 rounded-md text-sm text-gray-900 font-semibold"
              />
              <span className="text-gray-500">-</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-2 py-1 border border-gray-300 rounded-md text-sm text-gray-900 font-semibold"
              />
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-500">
          Загрузка данных...
        </div>
      ) : stats ? (
        <>
          {/* KPI Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Новые пользователи */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Новых пользователей</h3>
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-blue-600">{formatNumber(stats.new_users_month)}</p>
              <p className="text-xs text-gray-500 mt-1">
                Всего: {formatNumber(stats.total_users)} | Рост: 
                <span className={stats.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {' '}{stats.growth_rate >= 0 ? '↑' : '↓'} {formatPercent(Math.abs(stats.growth_rate))}
                </span>
              </p>
            </div>

            {/* Выручка */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Выручка</h3>
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.total_revenue_eur)}</p>
              <p className="text-xs text-gray-500 mt-1">
                За период {days} дней
              </p>
            </div>

            {/* DAU / WAU / MAU (переключаемая карточка) */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">
                  {activeMetric === 'dau' && 'DAU'}
                  {activeMetric === 'wau' && 'WAU'}
                  {activeMetric === 'mau' && 'MAU'}
                </h3>
                <div className="flex gap-1">
                  {(['dau', 'wau', 'mau'] as const).map((metric) => (
                    <button
                      key={metric}
                      onClick={() => setActiveMetric(metric)}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        activeMetric === metric
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      }`}
                    >
                      {metric.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-3xl font-bold text-purple-600">
                {formatNumber(
                  activeMetric === 'dau' ? stats.dau_count :
                  activeMetric === 'wau' ? stats.wau_count :
                  stats.mau_count
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatPercent(
                  activeMetric === 'dau' ? stats.dau_percentage :
                  activeMetric === 'wau' ? stats.wau_percentage :
                  stats.mau_percentage
                )} от общего числа
              </p>
            </div>

            {/* Всего генераций */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Всего генераций</h3>
                <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-orange-600">{formatNumber(stats.total_generations)}</p>
              <p className="text-xs text-gray-500 mt-1">
                За период {days} дней
              </p>
            </div>
          </div>

          {/* Новая строка с метриками монетизации */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* LTV (Lifetime Value) */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">LTV (Lifetime Value)</h3>
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-indigo-600">{formatCurrency(stats.ltv)}</p>
              <p className="text-xs text-gray-500 mt-1">
                Средний доход с клиента за всё время
              </p>
            </div>

            {/* Средний чек (AOV) */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Средний чек (AOV)</h3>
                <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-teal-600">{formatCurrency(stats.average_check)}</p>
              <p className="text-xs text-gray-500 mt-1">
                За период {days} дней
              </p>
            </div>

            {/* Платящие пользователи */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Платящих пользователей</h3>
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-emerald-600">{formatNumber(stats.paying_users_month)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatPercent(stats.paying_users_percentage)} от всех пользователей
              </p>
            </div>

            {/* Retention Rate */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Retention Rate</h3>
                <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-cyan-600">{formatPercent(stats.retention_rate)}</p>
              <p className="text-xs text-gray-500 mt-1">
                Повторные покупки (30 дней)
              </p>
            </div>
          </div>

          {/* Дополнительная статистика */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Реферальная программа</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Новых рефералов</span>
                  <span className="text-lg font-bold text-gray-900">{formatNumber(stats.new_referrals)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Период анализа</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Начало:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(stats.period_start).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Конец:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(stats.period_end).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-500">
          Нет данных для отображения
        </div>
      )}
    </div>
  );
}

