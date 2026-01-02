'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminAPI, type BillingConfigUpdateRequest, type WebhookVerifyResponse } from '@/services/api/admin';

export default function AdminBillingPage() {
  const qc = useQueryClient();
  const [secret, setSecret] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-billing-config'],
    queryFn: () => adminAPI.getBillingConfig(),
  });

  const [links, setLinks] = useState<Record<string, string>>({});
  const didInitRef = useRef(false);
  const [verifyRawBody, setVerifyRawBody] = useState('');
  const [verifySignature, setVerifySignature] = useState('');
  const [verifyResult, setVerifyResult] = useState<WebhookVerifyResponse | null>(null);

  // Инициализация полей ссылок после загрузки (один раз).
  // ВАЖНО: нельзя делать setState внутри useMemo (это может вызвать ререндеры/петли).
  useEffect(() => {
    if (!data) return;
    if (didInitRef.current) return;
    didInitRef.current = true;
    const next: Record<string, string> = {};
    for (const p of data.plans) {
      next[p.plan_id] = p.payment_link || '';
    }
    setLinks(next);
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (payload: BillingConfigUpdateRequest) => adminAPI.updateBillingConfig(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-billing-config'] });
      setSecret('');
      alert('Настройки биллинга сохранены');
    },
    onError: (e: any) => {
      alert(e?.response?.data?.detail || 'Ошибка сохранения настроек');
    },
  });

  const selftestMutation = useMutation({
    mutationFn: () => adminAPI.webhookSelftest(),
    onSuccess: (res) => {
      setVerifyRawBody(res.raw_body);
      setVerifySignature(res.signature);
      setVerifyResult({ valid: res.valid, secret_source: res.secret_source, parsed_event_name: null });
      alert(`Selftest: ${res.valid ? 'OK' : 'FAIL'} (secret_source=${res.secret_source})`);
    },
    onError: (e: any) => {
      alert(e?.response?.data?.detail || 'Ошибка selftest');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () => adminAPI.webhookVerify({ raw_body: verifyRawBody, signature: verifySignature }),
    onSuccess: (res) => {
      setVerifyResult(res);
      alert(`Проверка подписи: ${res.valid ? 'VALID' : 'INVALID'} (secret_source=${res.secret_source})`);
    },
    onError: (e: any) => {
      alert(e?.response?.data?.detail || 'Ошибка проверки подписи');
    },
  });

  const onSave = () => {
    const payload: BillingConfigUpdateRequest = { payment_links: links };
    if (secret.trim()) payload.tribute_webhook_secret = secret.trim();
    updateMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Биллинг</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">Ошибка загрузки настроек биллинга</p>
        </div>
      )}

      {isLoading || !data ? (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-500">Загрузка...</div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">TRIBUTE_WEBHOOK_SECRET</h3>
            <p className="text-sm text-gray-600 mb-4">
              Секрет хранится на backend в БД в зашифрованном виде. Мы не показываем текущее значение — только статус.
            </p>
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`text-xs px-2 py-1 rounded ${
                  data.tribute_webhook_secret_set ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {data.tribute_webhook_secret_set ? 'Установлен' : 'Не установлен'}
              </span>
              <span className="text-xs text-gray-500">
                В production webhook без секрета будет отклоняться
              </span>
            </div>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-semibold"
              placeholder="Вставьте новый секрет (оставьте пустым, чтобы не менять)"
            />
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Ссылки на оплату (4 пакета)</h3>
            <p className="text-sm text-gray-600 mb-4">
              Эти ссылки используются при создании платежа (BillingService). Для каждого пакета можно задать свою Tribute ссылку.
            </p>
            <div className="space-y-4">
              {data.plans.map((p) => (
                <div key={p.plan_id} className="grid md:grid-cols-3 gap-3 items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{p.plan_name}</div>
                    <div className="text-xs text-gray-500 font-mono">{p.plan_id} • {p.credits} credits</div>
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="url"
                      value={links[p.plan_id] ?? ''}
                      onChange={(e) => setLinks({ ...links, [p.plan_id]: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm text-gray-900 font-semibold"
                      placeholder="https://tribute.to/...."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onSave}
              disabled={updateMutation.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Последние транзакции</h3>
            <TransactionsTable />
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Последние webhook события Tribute</h3>
            <WebhookEventsTable />
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Проверка webhook подписи (Tribute)</h3>
            <p className="text-sm text-gray-600 mb-4">
              Tribute подписывает заголовок <span className="font-mono">trbt-signature</span> как HMAC-SHA256 от точного
              request body. Док: https://wiki.tribute.tg/for-content-creators/api-documentation/webhooks
            </p>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => selftestMutation.mutate()}
                disabled={selftestMutation.isPending}
                className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {selftestMutation.isPending ? 'Selftest...' : 'Selftest (сгенерировать payload + подпись)'}
              </button>
              <button
                onClick={() => verifyMutation.mutate()}
                disabled={verifyMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {verifyMutation.isPending ? 'Проверка...' : 'Проверить подпись'}
              </button>
            </div>

            {verifyResult && (
              <div className="mb-4 text-sm">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    verifyResult.valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {verifyResult.valid ? 'VALID' : 'INVALID'}
                </span>
                <span className="ml-2 text-gray-600">secret_source: {verifyResult.secret_source}</span>
                {verifyResult.parsed_event_name && (
                  <span className="ml-2 text-gray-600">event: {verifyResult.parsed_event_name}</span>
                )}
              </div>
            )}

            <label className="block text-sm font-medium text-gray-700 mb-1">Raw body (как пришло)</label>
            <textarea
              value={verifyRawBody}
              onChange={(e) => setVerifyRawBody(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-xs text-gray-900 font-semibold"
              placeholder='{"name":"new_subscription",...}'
            />

            <label className="block text-sm font-medium text-gray-700 mt-4 mb-1">trbt-signature</label>
            <input
              value={verifySignature}
              onChange={(e) => setVerifySignature(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-xs text-gray-900 font-semibold"
              placeholder="hex hmac"
            />
          </div>
        </>
      )}
    </div>
  );
}

function TransactionsTable() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-transactions', 50],
    queryFn: () => adminAPI.getTransactions(50),
  });

  if (isLoading) return <div className="text-gray-500">Загрузка...</div>;
  if (error) return <div className="text-red-700 text-sm">Ошибка загрузки транзакций</div>;
  if (!data || data.transactions.length === 0) return <div className="text-gray-500">Нет транзакций</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Время</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">payment_id</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.transactions.map((t) => (
            <tr key={t.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-700">{new Date(t.created_at).toLocaleString('ru-RU')}</td>
              <td className="px-4 py-3 text-xs text-gray-700 font-mono">{t.user_id.slice(0, 8)}…</td>
              <td className="px-4 py-3 text-sm text-gray-700">{t.plan_id || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{t.amount.toFixed(2)} EUR</td>
              <td className="px-4 py-3">
                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">{t.status}</span>
              </td>
              <td className="px-4 py-3 text-xs text-gray-700 font-mono">{t.payment_id || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WebhookEventsTable() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-webhook-events', 50],
    queryFn: () => adminAPI.getWebhookEvents(50),
  });

  if (isLoading) return <div className="text-gray-500">Загрузка...</div>;
  if (error) {
    return (
      <div className="text-sm">
        <div className="text-red-700">Ошибка загрузки webhook событий</div>
        <button
          onClick={() => refetch()}
          className="mt-2 px-3 py-1 bg-gray-900 text-white rounded-md hover:bg-gray-800"
        >
          Повторить
        </button>
      </div>
    );
  }
  if (!data || data.events.length === 0) return <div className="text-gray-500">Пока нет событий</div>;

  const statusBadge = (s: string) => {
    if (s === 'processed') return 'bg-green-100 text-green-800';
    if (s === 'already_processed') return 'bg-blue-100 text-blue-800';
    if (s === 'invalid_signature') return 'bg-red-100 text-red-800';
    if (s === 'error') return 'bg-red-100 text-red-800';
    if (s === 'received') return 'bg-gray-100 text-gray-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-600">Всего: {data.total}</div>
        <button
          onClick={() => refetch()}
          className="px-3 py-1 bg-gray-900 text-white rounded-md hover:bg-gray-800"
        >
          Обновить
        </button>
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Время</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">period_id</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">tg_user</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">http</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">error</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.events.map((e) => (
            <tr key={e.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-xs text-gray-700">{new Date(e.received_at).toLocaleString('ru-RU')}</td>
              <td className="px-4 py-3 text-xs text-gray-700 font-mono">{e.name || '—'}</td>
              <td className="px-4 py-3 text-xs text-gray-700 font-mono">{e.period_id || '—'}</td>
              <td className="px-4 py-3 text-xs text-gray-700 font-mono">{e.telegram_user_id || '—'}</td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-1 rounded ${statusBadge(e.status)}`}>{e.status}</span>
              </td>
              <td className="px-4 py-3 text-xs text-gray-700">{e.http_status ?? '—'}</td>
              <td className="px-4 py-3 text-xs text-gray-700 max-w-xs truncate">{e.error_message || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


