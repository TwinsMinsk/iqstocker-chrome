'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAPI, AdminLog } from '@/services/api/admin';

interface LogViewerProps {
  userId?: string;
  status?: string;
  errorType?: string;
}

export function LogViewer({ userId, status, errorType }: LogViewerProps) {
  const [limit, setLimit] = useState(100);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-logs', userId, status, errorType, limit],
    queryFn: () => adminAPI.getLogs({ user_id: userId, status, error_type: errorType, limit }),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'success':
        return 'Успешно';
      case 'completed':
        return 'Завершено';
      case 'error':
        return 'Ошибка';
      case 'paused':
        return 'Пауза';
      default:
        return status;
    }
  };

  const getErrorTypeColor = (errorType: string | null) => {
    if (!errorType) return '';
    switch (errorType) {
      case 'rate_limit':
        return 'bg-orange-100 text-orange-800';
      case 'network_error':
        return 'bg-red-100 text-red-800';
      case 'invalid_prompt':
        return 'bg-blue-100 text-blue-800';
      case 'discord_error':
        return 'bg-purple-100 text-purple-800';
      case 'unknown':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getErrorTypeLabel = (errorType: string | null) => {
    if (!errorType) return '';
    switch (errorType) {
      case 'rate_limit':
        return 'Лимит запросов';
      case 'network_error':
        return 'Ошибка сети';
      case 'invalid_prompt':
        return 'Неверный промпт';
      case 'discord_error':
        return 'Ошибка Discord';
      case 'unknown':
        return 'Неизвестно';
      default:
        return errorType;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Ошибка загрузки логов</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Логи расширения</h2>
          <p className="text-sm text-gray-600 mt-1">
            Всего: {data?.total || 0} записей
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Лимит:</label>
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Пользователь
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Сессия
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Промпты
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ошибка
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Длительность
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Время
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{log.user_email}</div>
                  <div className="text-xs text-gray-500">{log.user_id.slice(0, 8)}...</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 font-mono">{log.session_id.slice(0, 12)}...</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      log.status
                    )}`}
                  >
                    {getStatusLabel(log.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    Всего: {log.prompts_count}
                  </div>
                  <div className="text-xs text-gray-500">
                    ✓ {log.successful_count} / ✗ {log.failed_count}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {log.error_type ? (
                    <div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getErrorTypeColor(
                          log.error_type
                        )}`}
                      >
                        {getErrorTypeLabel(log.error_type)}
                      </span>
                      {log.error_message && (
                        <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                          {log.error_message}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.duration_seconds
                    ? `${Math.floor(log.duration_seconds / 60)}м ${log.duration_seconds % 60}с`
                    : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(log.timestamp).toLocaleString('ru-RU')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.logs.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500">Логи не найдены</p>
        </div>
      )}
    </div>
  );
}

