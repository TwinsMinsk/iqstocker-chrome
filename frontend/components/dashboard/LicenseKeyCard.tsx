'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authAPI } from '@/services/api/auth';

export function LicenseKeyCard() {
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => authAPI.getMe(),
  });

  // TODO: Получить license key из API (пока используем мок или из user если есть)
  const licenseKey = user?.license_key || 'sk_live_example1234567890';

  const handleCopy = () => {
    navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-black/40 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -z-10"></div>
      
      <h3 className="text-xs font-black tracking-[0.2em] text-white/30 uppercase mb-8">License Authorization</h3>
      
      <div className="relative mb-8">
        <div className="bg-black/60 border border-white/5 rounded-2xl p-4 font-mono text-xs overflow-hidden whitespace-nowrap">
           <span className={`${showKey ? 'text-indigo-400' : 'text-white/10 blur-[6px]'} transition-all duration-500`}>
             {licenseKey}
           </span>
        </div>
        <button 
          onClick={() => setShowKey(!showKey)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors"
        >
          {showKey ? 'Hide' : 'Show'}
        </button>
      </div>

      <button
        onClick={handleCopy}
        className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
          copied 
            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
            : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.3)]'
        }`}
      >
        {copied ? '✓ COPIED TO CLIPBOARD' : '📋 COPY LICENSE KEY'}
      </button>
      
      <div className="mt-8 flex items-center justify-center gap-4">
         <button className="text-[10px] font-bold text-white/20 hover:text-white transition-colors uppercase tracking-[0.2em]">Regenerate Key</button>
         <div className="w-1 h-1 rounded-full bg-white/10"></div>
         <Link href="/docs/extension" className="text-[10px] font-bold text-white/20 hover:text-white transition-colors uppercase tracking-[0.2em]">Setup Guide</Link>
      </div>
    </div>
  );
}

// Добавим импорт Link, так как он используется
import Link from 'next/link';


