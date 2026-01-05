'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
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
        className="relative bg-[#0d0d12] border border-white/10 w-full max-w-2xl max-h-[90vh] rounded-[32px] shadow-2xl shadow-indigo-500/10 flex flex-col overflow-hidden"
        onClick={handleContentClick}
        tabIndex={-1}
      >
        <div className="flex-shrink-0 bg-[#0d0d12] border-b border-white/5 p-6 flex items-center justify-between z-10">
          <h3 id="modal-title" className="text-xl font-black text-white uppercase tracking-wider pr-4">
            Информация о сервисе
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
        
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10 custom-scrollbar">
          
          {/* Section 1 */}
          <section>
            <h4 className="text-xl font-bold text-white mb-4">Что делает этот сервис?</h4>
            <div className="text-gray-300 leading-relaxed space-y-2">
              <p>
                Он <span className="text-indigo-400 font-bold">не придумывает и не генерирует промпты за вас.</span>
              </p>
              <p>
                Вы заранее готовите список промптов.
              </p>
              <p>
                Сервис <span className="text-indigo-400 font-bold">автоматически отправляет их в Midjourney Discord по очереди</span> - без ручной отправки и без вашего участия в процессе.
              </p>
            </div>
          </section>

          <div className="w-full h-px bg-white/5" />

          {/* Section 2 */}
          <section>
            <h4 className="text-xl font-bold text-white mb-6">Зачем вам это?</h4>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-white font-bold mb-1">Экономия времени</h5>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Вместо того чтобы отправлять промпты по одному, вы загружаете весь список сразу - и запускаете генерацию одним действием.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-white font-bold mb-1">Экономия денег</h5>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Если вы не хотите покупать fast-часы, с расширением можно спокойно работать в slow-mode без потери эффективности.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-white font-bold mb-1">Удобство</h5>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Вы один раз настраиваете расширение и больше не думаете о рутинной отправке промптов.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="w-full h-px bg-white/5" />

          {/* Section 3 */}
          <section>
            <h4 className="text-xl font-bold text-white mb-4">Что делать, когда вы запустили автогенеринг?</h4>
            <div className="text-gray-300 leading-relaxed">
              <p className="mb-2">Что угодно - вы можете заняться любыми делами.</p>
              <p>Отправка промптов продолжается автоматически, в том числе <span className="text-indigo-400 font-bold">в фоновом режиме.</span></p>
            </div>
          </section>

          <div className="w-full h-px bg-white/5" />

          {/* Section 4 */}
          <section>
            <h4 className="text-xl font-bold text-white mb-4">Кому это подойдёт?</h4>
            <p className="text-gray-300 leading-relaxed">
              Если вы работаете с Midjourney и не хотите тратить время на рутинную отправку промптов - <span className="text-indigo-400 font-bold">этот сервис для вас.</span>
            </p>
          </section>

        </div>
        
        <div className="flex-shrink-0 p-6 border-t border-white/5 bg-[#0d0d12] flex justify-center z-10">
          <button 
            onClick={onClose}
            className="w-full sm:w-auto px-12 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Понятно
          </button>
        </div>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>,
    document.body
  );
}
