'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface AboutServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutServiceModal({ isOpen, onClose }: AboutServiceModalProps) {
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
      if (modalRef.current) {
        modalRef.current.focus();
      }
    }
    
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div 
        ref={modalRef}
        className="relative bg-[#0d0d12] border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl shadow-indigo-500/10 flex flex-col overflow-hidden"
        onClick={handleContentClick}
        tabIndex={-1}
      >
        <div className="flex-shrink-0 bg-[#0d0d12] border-b border-white/5 p-6 flex items-center justify-between z-10">
          <h3 id="modal-title" className="text-xl font-black text-white uppercase tracking-wider pr-4">
            О сервисе
          </h3>
          <button 
            onClick={onClose}
            className="flex-shrink-0 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            aria-label="Закрыть"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
          <div className="space-y-12 text-gray-300">
            
            <section>
              <h4 className="text-2xl font-bold text-white mb-6">Что делает этот сервис?</h4>
              <div className="bg-white/5 p-6 rounded-2xl border border-white/5 leading-relaxed">
                Сервис <span className="font-bold text-white">автоматически отправляет ваши промпты в Midjourney Discord.</span><br/>
                Он <span className="font-bold text-white">не придумывает и не генерирует промпты за вас.</span><br/>
                Перед началом генеринга вам надо заранее самостоятельно их подготовить.
              </div>
            </section>

            <div className="flex items-center justify-center opacity-30">
               <div className="h-px bg-gradient-to-r from-transparent via-white to-transparent w-full max-w-xs"></div>
            </div>

            <section>
              <h4 className="text-2xl font-bold text-white mb-6">Зачем вам это?</h4>
              
              <div className="grid gap-6 md:grid-cols-3">
                 <div className="bg-[#15151a] p-6 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-colors group h-full">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400 group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="font-bold text-white mb-2 text-lg">Экономия времени</div>
                    <p className="text-sm text-gray-400 leading-relaxed">Вместо того чтобы отправлять промпты по одному, вы загружаете весь список сразу - и запускаете генерацию одним действием.</p>
                 </div>
                 
                 <div className="bg-[#15151a] p-6 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-colors group h-full">
                     <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 text-purple-400 group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="font-bold text-white mb-2 text-lg">Экономия денег</div>
                    <p className="text-sm text-gray-400 leading-relaxed">Если вы не хотите покупать fast-часы, с расширением можно спокойно работать в slow-mode без потери эффективности.</p>
                 </div>

                 <div className="bg-[#15151a] p-6 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-colors group h-full">
                     <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mb-4 text-green-400 group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="font-bold text-white mb-2 text-lg">Удобство</div>
                    <p className="text-sm text-gray-400 leading-relaxed">Вы один раз настраиваете расширение и больше не думаете о рутинной отправке промптов.</p>
                 </div>
              </div>
            </section>

            <div className="flex items-center justify-center opacity-30">
               <div className="h-px bg-gradient-to-r from-transparent via-white to-transparent w-full max-w-xs"></div>
            </div>

            <section>
              <h4 className="text-2xl font-bold text-white mb-4">Что делать, когда вы запустили автогенеринг?</h4>
              <p className="leading-relaxed text-lg">
                Что угодно - вы можете заняться любыми делами.<br/>
                Отправка промптов продолжается автоматически, в том числе <span className="font-bold text-white">в фоновом режиме.</span>
              </p>
            </section>
            
            <div className="flex items-center justify-center opacity-30">
               <div className="h-px bg-gradient-to-r from-transparent via-white to-transparent w-full max-w-xs"></div>
            </div>

            <section className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 p-8 rounded-3xl border border-white/5">
              <h4 className="text-2xl font-bold text-white mb-4">Кому это подойдёт?</h4>
              <p className="leading-relaxed text-lg text-gray-300">
                Если вы работаете с Midjourney и не хотите тратить время на рутинную отправку промптов - <span className="font-bold text-white">этот сервис для вас.</span>
              </p>
            </section>

          </div>
        </div>
        
        <div className="flex-shrink-0 p-6 border-t border-white/5 bg-[#0d0d12] flex justify-end z-10">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            Все понятно
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
