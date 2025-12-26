'use client';

import { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
      
      // Фокус на модальное окно для доступности
      if (modalRef.current) {
        modalRef.current.focus();
      }
    }
    
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  // Предотвращаем закрытие при клике на контент
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        ref={modalRef}
        className="relative bg-[#0d0d12] border border-white/10 w-full max-w-2xl max-h-[90vh] rounded-[32px] shadow-2xl shadow-indigo-500/10 flex flex-col overflow-hidden"
        onClick={handleContentClick}
        tabIndex={-1}
      >
        {/* Header - фиксированный */}
        <div className="flex-shrink-0 bg-[#0d0d12]/95 backdrop-blur-md border-b border-white/5 p-6 flex items-center justify-between">
          <h3 id="modal-title" className="text-xl font-black text-white uppercase tracking-wider pr-4">
            {title}
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
        
        {/* Content - скроллируемый */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto overscroll-contain modal-scrollbar"
          style={{ 
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(99, 102, 241, 0.3) transparent'
          }}
        >
          <div className="p-8">
            {children}
          </div>
        </div>
        
        {/* Footer - фиксированный */}
        <div className="flex-shrink-0 p-6 border-t border-white/5 bg-[#0d0d12]/95 backdrop-blur-md flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}

