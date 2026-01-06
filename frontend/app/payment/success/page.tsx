'use client';

import Link from 'next/link';

export default function PaymentSuccessPage() {
  return (
    <div className="bg-[#050505] text-gray-200 min-h-screen flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[600px] bg-green-600/10 blur-[120px] rounded-full -z-10 pointer-events-none" />
        
        <div className="relative group max-w-xl mx-auto">
          {/* Animated glow border */}
          <div className="absolute -inset-1 bg-gradient-to-r from-green-500 via-emerald-600 to-green-500 rounded-[40px] blur-xl opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          
          <div className="relative bg-[#0a0a0c] rounded-[38px] p-8 md:p-12 border border-white/10 shadow-2xl backdrop-blur-xl text-center">
            {/* Success Icon */}
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center">
              <svg 
                className="w-12 h-12 text-green-400" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-6">
              Оплата прошла успешно!
            </h1>
            
            <p className="text-lg text-gray-400 mb-12 leading-relaxed">
              Ваши кредиты были успешно начислены на ваш баланс.<br />
              Теперь вы можете использовать их для автоматической генерации.
            </p>

            <Link
              href="/dashboard"
              className="inline-block w-full sm:w-auto px-12 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black rounded-2xl text-lg transition-all shadow-[0_10px_40px_rgba(79,70,229,0.3)] hover:shadow-[0_15px_50px_rgba(79,70,229,0.4)] active:scale-[0.98]"
            >
              Перейти в личный кабинет
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
