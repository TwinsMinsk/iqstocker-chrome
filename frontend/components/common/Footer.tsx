'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';

export function Footer() {
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  return (
    <footer className="bg-[#050505] border-t border-white/5 text-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 md:gap-8">
            <div className="col-span-1 md:col-span-1">
              <h3 className="text-xl font-black mb-6 tracking-tighter uppercase italic">IQСТОКЕР<span className="text-white/40">ГЕНЕРИНГ</span></h3>
              <p className="text-white/30 text-xs font-bold leading-relaxed uppercase tracking-widest max-w-xs">
                Профессиональная автоматизация для цифровых художников. 
                Экономим ваше время с 2025 года.
              </p>
            </div>

            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-8">Продукт</h4>
              <ul className="space-y-4 text-[10px] font-bold uppercase tracking-widest">
                <li><Link href="/#features" className="text-white/40 hover:text-white transition-colors">Возможности</Link></li>
                <li><Link href="/#pricing" className="text-white/40 hover:text-white transition-colors">Тарифы</Link></li>
                <li><Link href="/#faq" className="text-white/40 hover:text-white transition-colors">FAQ</Link></li>
                <li>
                  <button 
                    onClick={() => setIsPrivacyModalOpen(true)}
                    className="text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    Политика конфиденциальности
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-8">Поддержка</h4>
              <ul className="space-y-4 text-[10px] font-bold uppercase tracking-widest">
                <li>
                  <a 
                    href="https://t.me/your_support" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    Написать в тех.поддержку
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-8">Наши соц.сети</h4>
              <div className="flex gap-4">
                <a 
                  href="https://t.me/your_telegram" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="transition-transform hover:scale-110"
                  aria-label="Telegram"
                >
                  <svg className="w-8 h-8" fill="#0088cc" viewBox="0 0 24 24">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                </a>
                <a 
                  href="https://instagram.com/your_instagram" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="transition-transform hover:scale-110"
                  aria-label="Instagram"
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <defs>
                      <linearGradient id="instagram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f09433" />
                        <stop offset="25%" stopColor="#e6683c" />
                        <stop offset="50%" stopColor="#dc2743" />
                        <stop offset="75%" stopColor="#cc2366" />
                        <stop offset="100%" stopColor="#bc1888" />
                      </linearGradient>
                    </defs>
                    <path fill="url(#instagram-gradient)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-24 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">
              &copy; {new Date().getFullYear()} IQСтокер Генеринг.
            </p>
            <div className="flex gap-8 items-center">
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Работает</span>
               </div>
            </div>
          </div>
        </div>
      </footer>
      <PrivacyPolicyModal 
        isOpen={isPrivacyModalOpen} 
        onClose={() => setIsPrivacyModalOpen(false)} 
      />
  );
}
