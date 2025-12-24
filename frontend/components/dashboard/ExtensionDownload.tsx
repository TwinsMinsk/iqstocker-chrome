'use client';

import Link from 'next/link';

export function ExtensionDownload() {
  const handleDownload = (type: 'zip' | 'exe') => {
    // TODO: Реализовать скачивание расширения
    const url =
      type === 'zip'
        ? '/api/extensions/download/zip'
        : '/api/extensions/download/exe';
    window.open(url, '_blank');
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900/20 to-black border border-white/5 rounded-[40px] p-12 flex flex-col lg:flex-row items-center justify-between gap-16 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(79,70,229,0.1),transparent)]"></div>
      
      <div className="max-w-xl relative z-10">
        <h3 className="text-xs font-black tracking-[0.4em] text-indigo-400 uppercase mb-6">Инструментарий</h3>
        <h4 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter uppercase leading-[0.8]">
          Chrome<br/>
          <span className="text-white/20 tracking-[-0.05em]">Расширение</span>
        </h4>
        <p className="text-lg text-white/40 font-light leading-relaxed mb-10 max-w-md">
          Скачайте расширение IQStocker Auto. Автоматизируйте Discord без лимитов напрямую из браузера.
        </p>
        
        <div className="flex flex-wrap gap-6">
           <button 
             onClick={() => handleDownload('zip')}
             className="group px-10 py-5 bg-white text-black rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-50 transition-all flex items-center gap-4 shadow-2xl shadow-white/5"
           >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
              Скачать ZIP
           </button>
           <button 
             onClick={() => handleDownload('exe')}
             className="px-10 py-5 bg-white/5 border border-white/10 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all"
           >
              Скачать EXE
           </button>
        </div>
      </div>
      
      <div className="relative z-10 hidden lg:block">
         <div className="w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] absolute inset-0 animate-pulse"></div>
         <div className="relative bg-[#0a0a0f] border border-white/10 rounded-[40px] p-10 w-80 transform rotate-2 shadow-2xl shadow-indigo-500/10">
            <div className="flex gap-2 mb-8">
               <div className="w-2.5 h-2.5 rounded-full bg-red-500/20"></div>
               <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20"></div>
               <div className="w-2.5 h-2.5 rounded-full bg-green-500/20"></div>
            </div>
            <div className="space-y-6">
               <div className="h-2 w-full bg-white/5 rounded-full"></div>
               <div className="h-2 w-4/5 bg-white/5 rounded-full"></div>
               <div className="h-2 w-2/3 bg-white/5 rounded-full"></div>
               <div className="h-12 w-full bg-indigo-500/10 rounded-2xl mt-10 flex items-center justify-center">
                  <div className="w-20 h-2 bg-indigo-500/30 rounded-full"></div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}


