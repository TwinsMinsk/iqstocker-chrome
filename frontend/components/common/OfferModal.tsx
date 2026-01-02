'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OfferModal({ isOpen, onClose }: OfferModalProps) {
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
        className="relative bg-[#0d0d12] border border-white/10 w-full max-w-6xl max-h-[90vh] rounded-[32px] shadow-2xl shadow-indigo-500/10 flex flex-col overflow-hidden"
        onClick={handleContentClick}
        tabIndex={-1}
      >
        <div className="flex-shrink-0 bg-[#0d0d12] border-b border-white/5 p-6 flex items-center justify-between z-10">
          <h3 id="modal-title" className="text-xl font-black text-white uppercase tracking-wider pr-4">
            Публичная оферта
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
        
        <div className="flex-1 overflow-hidden p-6">
          <div className="w-full h-full min-h-[600px] bg-white rounded-lg overflow-hidden">
            <iframe
              src="/Оферта IQСТОКЕР ГЕНЕРИНГ.pdf#toolbar=1"
              className="w-full h-full border-0"
              title="Публичная оферта"
              style={{ minHeight: '600px' }}
            />
          </div>
        </div>
        
        <div className="flex-shrink-0 p-6 border-t border-white/5 bg-[#0d0d12] flex justify-end z-10">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
