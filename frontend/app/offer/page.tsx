'use client';

import Link from 'next/link';

export default function OfferPage() {
  return (
    <div className="bg-[#050505] text-gray-200 min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-[#0a0a0c] rounded-2xl p-8 md:p-12 border border-white/10">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-6">
            Публичная оферта
          </h1>
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-400 mb-4">
              Здесь будет размещена публичная оферта.
            </p>
            <Link 
              href="/"
              className="text-indigo-400 hover:text-indigo-300 underline"
            >
              Вернуться на главную
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

