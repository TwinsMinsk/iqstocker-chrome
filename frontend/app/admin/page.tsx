'use client';

import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '@/services/api/admin';
import Link from 'next/link';

export default function AdminPage() {
  const { data: usersData } = useQuery({
    queryKey: ['admin-users', 1, 5],
    queryFn: () => adminAPI.getUsers({ page: 1, limit: 5 }),
  });

  const { data: logsData } = useQuery({
    queryKey: ['admin-logs', undefined, undefined, undefined, 10],
    queryFn: () => adminAPI.getLogs({ limit: 10 }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Обзор системы</h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Всего пользователей</h3>
          <p className="text-3xl font-bold text-blue-600">
            {usersData?.total || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Всего логов</h3>
          <p className="text-3xl font-bold text-green-600">
            {logsData?.total || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Активных сессий</h3>
          <p className="text-3xl font-bold text-purple-600">
            {logsData?.logs.filter(log => log.status === 'success' || log.status === 'completed').length || 0}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Последние пользователи</h3>
            <Link
              href="/admin/users"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Все →
            </Link>
          </div>
          <div className="space-y-3">
            {usersData?.users.slice(0, 5).map((user) => (
              <div key={user.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                  <p className="text-xs text-gray-500">
                    Баланс: {user.balance} кредитов
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    user.is_blocked
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {user.is_blocked ? 'Заблокирован' : 'Активен'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Последние логи</h3>
            <Link
              href="/admin/logs"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Все →
            </Link>
          </div>
          <div className="space-y-3">
            {logsData?.logs.slice(0, 5).map((log) => (
              <div key={log.id} className="py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{log.user_email}</p>
                    <p className="text-xs text-gray-500">
                      {log.prompts_count} промптов • {new Date(log.timestamp).toLocaleString('ru-RU')}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      log.status === 'success' || log.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : log.status === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

