'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI, AdminUserUpdateRequest } from '@/services/api/admin';

interface BalanceEditorProps {
  userId: string;
  currentBalance: number;
  onSuccess?: () => void;
}

export function BalanceEditor({ userId, currentBalance, onSuccess }: BalanceEditorProps) {
  const [balance, setBalance] = useState(currentBalance);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: AdminUserUpdateRequest) => adminAPI.updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onSuccess?.();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ balance });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Редактировать баланс</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Текущий баланс: {currentBalance} кредитов
        </label>
        <input
          type="number"
          value={balance}
          onChange={(e) => setBalance(parseInt(e.target.value) || 0)}
          min="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-bold"
          required
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={updateMutation.isPending || balance === currentBalance}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
        </button>
        <button
          type="button"
          onClick={() => setBalance(currentBalance)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          Сбросить
        </button>
      </div>

      {updateMutation.isError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            Ошибка: {updateMutation.error instanceof Error ? updateMutation.error.message : 'Неизвестная ошибка'}
          </p>
        </div>
      )}

      {updateMutation.isSuccess && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">Баланс успешно обновлен</p>
        </div>
      )}
    </form>
  );
}

