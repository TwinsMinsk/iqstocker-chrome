'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersAPI } from '@/services/api/users';
import Link from 'next/link';

export function LicenseKeyCard() {
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const queryClient = useQueryClient();

  // Получить полный профиль пользователя (включая license_key)
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => usersAPI.getProfile(),
  });

  // Мутация для генерации нового ключа
  const generateKeyMutation = useMutation({
    mutationFn: () => usersAPI.generateLicenseKey(),
    onSuccess: () => {
      // Обновить профиль после генерации ключа
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });

  const licenseKey = profile?.license_key?.display || '';
  const hasKey = !!licenseKey;

  const handleCopy = () => {
    if (licenseKey) {
      navigator.clipboard.writeText(licenseKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    if (confirm('Сгенерировать новый ключ? Старый ключ будет отозван.')) {
      try {
        await generateKeyMutation.mutateAsync();
      } catch (error) {
        console.error('Failed to generate license key:', error);
        alert('Не удалось сгенерировать ключ. Попробуйте позже.');
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900/60 via-purple-900/50 to-indigo-900/60 border-2 border-indigo-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm">
      <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 blur-3xl -z-10"></div>
      
      <h3 className="text-sm font-black tracking-[0.2em] text-indigo-300 uppercase mb-8 drop-shadow-lg">Авторизация лицензии</h3>
      
      {isLoading ? (
        <div className="bg-black/70 border-2 border-indigo-500/30 rounded-2xl p-6 text-center text-indigo-200 text-sm font-medium">
          Загрузка...
        </div>
      ) : hasKey ? (
        <>
          <div className="relative mb-6">
            <div className="bg-black/80 border-2 border-indigo-500/40 rounded-2xl p-5 font-mono text-sm overflow-hidden whitespace-nowrap shadow-lg">
              <span className={`${showKey ? 'text-indigo-300' : 'text-white/20 blur-[6px]'} transition-all duration-500 font-semibold`}>
                {licenseKey}
              </span>
            </div>
            <button 
              onClick={() => setShowKey(!showKey)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-widest text-indigo-300 hover:text-indigo-100 transition-colors bg-indigo-900/50 px-3 py-1 rounded-lg"
            >
              {showKey ? 'Скрыть' : 'Показать'}
            </button>
          </div>

          <button
            onClick={handleCopy}
            disabled={!licenseKey}
            className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg ${
              copied 
                ? 'bg-green-600/90 text-white border-2 border-green-400 shadow-green-500/50' 
                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.5)] disabled:opacity-50 disabled:cursor-not-allowed border-2 border-indigo-400/50'
            }`}
          >
            {copied ? '✓ СКОПИРОВАНО' : '📋 КОПИРОВАТЬ КЛЮЧ'}
          </button>
        </>
      ) : (
        <div className="bg-black/70 border-2 border-yellow-500/40 rounded-2xl p-6 text-center text-yellow-200 text-sm font-medium mb-6 shadow-lg">
          ⚠️ У вас нет лицензионного ключа. Нажмите "Создать ключ" чтобы создать.
        </div>
      )}
      
      <div className="mt-6 flex items-center justify-center gap-4">
        <button 
          onClick={handleRegenerate}
          disabled={generateKeyMutation.isPending || isLoading}
          className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-[0.2em] transition-all shadow-lg ${
            generateKeyMutation.isPending 
              ? 'bg-indigo-800/50 text-indigo-300 border-2 border-indigo-600/50 cursor-wait' 
              : 'bg-indigo-600 hover:bg-indigo-500 text-white border-2 border-indigo-400/50 hover:border-indigo-300/70'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {generateKeyMutation.isPending ? '⏳ Генерация...' : hasKey ? '🔄 Обновить ключ' : '✨ Создать ключ'}
        </button>
        <div className="w-1 h-1 rounded-full bg-indigo-400/50"></div>
        <Link href="/docs/extension" className="text-xs font-bold text-indigo-300 hover:text-indigo-100 transition-colors uppercase tracking-[0.2em] px-3 py-2 rounded-lg hover:bg-indigo-900/30">
          📖 Инструкция
        </Link>
      </div>
    </div>
  );
}

