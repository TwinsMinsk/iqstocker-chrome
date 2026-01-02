'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI, type PromoCode, type CreatePromoRequest, type ReferralConfig, type UpdateReferralConfigRequest } from '@/services/api/admin';

export default function AdminPromoCodesPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const queryClient = useQueryClient();

  const { data: promoCodes, isLoading, error: promoError } = useQuery({
    queryKey: ['admin-promocodes', includeInactive],
    queryFn: () => adminAPI.getPromoCodes(includeInactive),
  });

  const { data: referralConfigs, isLoading: isReferralLoading, error: referralError } = useQuery({
    queryKey: ['admin-referral-configs'],
    queryFn: () => adminAPI.getReferralConfigs(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreatePromoRequest) => adminAPI.createPromoCode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promocodes'] });
      setShowCreateForm(false);
      alert('Промокод успешно создан!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Ошибка при создании промокода');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (code: string) => adminAPI.deactivatePromoCode(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promocodes'] });
      alert('Промокод деактивирован!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Ошибка при деактивации промокода');
    },
  });

  const updateReferralMutation = useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: UpdateReferralConfigRequest }) =>
      adminAPI.updateReferralConfig(planId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-referral-configs'] });
      alert('Настройки реферальной награды обновлены!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Ошибка при обновлении реферальных настроек');
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: CreatePromoRequest = {
      code: formData.get('code') as string,
      credit_amount: parseInt(formData.get('credit_amount') as string),
      max_uses: formData.get('max_uses') ? parseInt(formData.get('max_uses') as string) : undefined,
      expires_at: formData.get('expires_at') ? (formData.get('expires_at') as string) : undefined,
      description: formData.get('description') ? (formData.get('description') as string) : undefined,
    };
    createMutation.mutate(data);
  };

  const handleDeactivate = (code: string) => {
    if (confirm(`Вы уверены, что хотите деактивировать промокод "${code}"?`)) {
      deactivateMutation.mutate(code);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Управление промокодами</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {showCreateForm ? 'Отмена' : '+ Создать промокод'}
        </button>
      </div>

      {promoError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">Ошибка загрузки промокодов</p>
        </div>
      )}

      {/* Форма создания */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Создать новый промокод</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Код промокода *
                </label>
                <input
                  type="text"
                  name="code"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-semibold"
                  placeholder="WELCOME2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Количество кредитов *
                </label>
                <input
                  type="number"
                  name="credit_amount"
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-semibold"
                  placeholder="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Максимум использований (оставьте пустым для безлимита)
                </label>
                <input
                  type="number"
                  name="max_uses"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-semibold"
                  placeholder="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Дата истечения (опционально)
                </label>
                <input
                  type="datetime-local"
                  name="expires_at"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-semibold"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание (опционально)
              </label>
              <textarea
                name="description"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-semibold"
                placeholder="Описание промокода для админки"
              />
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Создание...' : 'Создать промокод'}
            </button>
          </form>
        </div>
      )}

      {/* Фильтры */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-700">Показать деактивированные</span>
        </label>
      </div>

      {/* Таблица промокодов */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Загрузка...</div>
        ) : promoCodes && promoCodes.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Код
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Кредиты
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Использований
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Истекает
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Описание
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {promoCodes.map((promo) => (
                <tr key={promo.code} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900 font-mono">
                      {promo.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{promo.credit_amount}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {promo.current_uses}
                      {promo.max_uses !== null ? ` / ${promo.max_uses}` : ' / ∞'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        promo.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {promo.is_active ? 'Активен' : 'Деактивирован'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{formatDate(promo.expires_at)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">
                      {promo.description || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {promo.is_active && (
                      <button
                        onClick={() => handleDeactivate(promo.code)}
                        disabled={deactivateMutation.isPending}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        Деактивировать
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-gray-500">
            Промокоды не найдены
          </div>
        )}
      </div>

      {/* Реферальные награды */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Реферальные награды по тарифам</h3>
        <p className="text-sm text-gray-600 mb-4">
          Награда начисляется пригласившему после успешной оплаты рефералом (идемпотентно по payment_id).
        </p>

        {referralError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">Ошибка загрузки реферальных настроек</p>
          </div>
        )}

        {isReferralLoading ? (
          <div className="text-gray-500">Загрузка...</div>
        ) : referralConfigs && referralConfigs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тариф</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Награда (кредиты)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Активна</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {referralConfigs.map((cfg: ReferralConfig) => (
                  <ReferralConfigRow
                    key={cfg.tariff_plan_id}
                    cfg={cfg}
                    isSaving={updateReferralMutation.isPending}
                    onSave={(planId, data) => updateReferralMutation.mutate({ planId, data })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-500">Нет данных</div>
        )}
      </div>
    </div>
  );
}

function ReferralConfigRow({
  cfg,
  isSaving,
  onSave,
}: {
  cfg: ReferralConfig;
  isSaving: boolean;
  onSave: (planId: string, data: UpdateReferralConfigRequest) => void;
}) {
  const [reward, setReward] = useState<number>(cfg.reward_credits);
  const [active, setActive] = useState<boolean>(cfg.is_active);

  const changed = reward !== cfg.reward_credits || active !== cfg.is_active;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-medium text-gray-900">{cfg.plan_name}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm text-gray-500 font-mono">{cfg.tariff_plan_id}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <input
          type="number"
          min={0}
          value={reward}
          onChange={(e) => setReward(parseInt(e.target.value || '0', 10))}
          className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 font-bold"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          {active ? 'Да' : 'Нет'}
        </label>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button
          disabled={!changed || isSaving}
          onClick={() => onSave(cfg.tariff_plan_id, { reward_credits: reward, is_active: active })}
          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
        >
          Сохранить
        </button>
      </td>
    </tr>
  );
}

