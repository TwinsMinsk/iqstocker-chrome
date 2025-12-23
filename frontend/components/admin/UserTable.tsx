'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI, AdminUser, AdminUserUpdateRequest } from '@/services/api/admin';

interface UserTableProps {
  page?: number;
  limit?: number;
  search?: string;
  sort?: 'created_at' | 'balance';
  onPageChange?: (page: number) => void;
}

export function UserTable({
  page = 1,
  limit = 50,
  search = '',
  sort = 'created_at',
  onPageChange,
}: UserTableProps) {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AdminUserUpdateRequest>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users', page, limit, search, sort],
    queryFn: () => adminAPI.getUsers({ page, limit, search, sort }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: AdminUserUpdateRequest }) =>
      adminAPI.updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingUser(null);
      setEditForm({});
    },
  });

  const handleEdit = (user: AdminUser) => {
    setEditingUser(user.id);
    setEditForm({
      balance: user.balance,
      is_blocked: user.is_blocked,
      is_admin: user.is_admin,
    });
  };

  const handleSave = (userId: string) => {
    updateMutation.mutate({ userId, data: editForm });
  };

  const handleCancel = () => {
    setEditingUser(null);
    setEditForm({});
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Ошибка загрузки пользователей</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold">Пользователи</h2>
        <p className="text-sm text-gray-600 mt-1">
          Всего: {data?.total || 0} пользователей
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Баланс
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Тариф
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Дата регистрации
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.email}</div>
                      <div className="text-xs text-gray-500">
                        {user.is_admin && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            Админ
                          </span>
                        )}
                        {!user.email_verified && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 ml-1">
                            Не подтвержден
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingUser === user.id ? (
                    <input
                      type="number"
                      value={editForm.balance ?? user.balance}
                      onChange={(e) =>
                        setEditForm({ ...editForm, balance: parseInt(e.target.value) })
                      }
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  ) : (
                    <span className="text-sm text-gray-900">{user.balance}</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900 capitalize">{user.subscription_tier}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingUser === user.id ? (
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editForm.is_blocked ?? user.is_blocked}
                          onChange={(e) =>
                            setEditForm({ ...editForm, is_blocked: e.target.checked })
                          }
                          className="mr-2"
                        />
                        <span className="text-xs text-gray-700">Заблокирован</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editForm.is_admin ?? user.is_admin}
                          onChange={(e) =>
                            setEditForm({ ...editForm, is_admin: e.target.checked })
                          }
                          className="mr-2"
                        />
                        <span className="text-xs text-gray-700">Админ</span>
                      </label>
                    </div>
                  ) : (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_blocked
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {user.is_blocked ? 'Заблокирован' : 'Активен'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString('ru-RU')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {editingUser === user.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(user.id)}
                        disabled={updateMutation.isPending}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                      >
                        Сохранить
                      </button>
                      <button
                        onClick={handleCancel}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Редактировать
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.pagination.total_pages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Страница {data.pagination.page} из {data.pagination.total_pages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Назад
            </button>
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= data.pagination.total_pages}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Вперед
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

