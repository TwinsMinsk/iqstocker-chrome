'use client';

import { useState } from 'react';
import { UserTable } from '@/components/admin/UserTable';

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'created_at' | 'balance'>('created_at');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Управление пользователями</h2>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="Поиск по email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-semibold"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as 'created_at' | 'balance')}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-semibold"
          >
            <option value="created_at">Сортировка по дате</option>
            <option value="balance">Сортировка по балансу</option>
          </select>
        </div>

        <UserTable
          page={page}
          limit={50}
          search={search}
          sort={sort}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

