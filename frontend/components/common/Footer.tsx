'use client';

import Link from 'next/link';
import { useState } from 'react';

export function Footer() {
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportItem, setSupportItem] = useState<string>('');

  const openSupportModal = (item: string) => {
    setSupportItem(item);
    setShowSupportModal(true);
  };

  const closeModal = () => {
    setShowSupportModal(false);
    setSupportItem('');
  };

  return (
    <>
      <footer className="bg-[#050505] border-t border-white/5 text-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8">
            <div className="col-span-1 md:col-span-1">
              <h3 className="text-xl font-black mb-6 tracking-tighter uppercase italic">IQSTOCKER<span className="text-white/40">AUTO</span></h3>
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
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-8">Поддержка</h4>
              <ul className="space-y-4 text-[10px] font-bold uppercase tracking-widest">
                <li>
                  <button 
                    onClick={() => openSupportModal('Документация')}
                    className="text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    Документация
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => openSupportModal('Контакты')}
                    className="text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    Контакты
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => openSupportModal('Telegram')}
                    className="text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    Telegram
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-24 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">
              &copy; {new Date().getFullYear()} IQStocker Auto. Digital Forge.
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

      {/* Support Modal */}
      {showSupportModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div 
            className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-white uppercase tracking-widest">
                {supportItem}
              </h3>
              <button
                onClick={closeModal}
                className="text-white/40 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="text-white/60 text-sm leading-relaxed mb-6">
              <p className="mb-4">
                Информация будет добавлена в ближайшее время.
              </p>
              <p className="text-xs text-white/40">
                Мы работаем над наполнением этого раздела. Спасибо за понимание!
              </p>
            </div>

            <button
              onClick={closeModal}
              className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors uppercase tracking-widest text-xs"
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </>
  );
}
