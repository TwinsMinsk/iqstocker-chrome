'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/common/Modal';

export function ExtensionDownload() {
  /**
   * UI скачивания расширения:
   * - скачиваем ТОЛЬКО ZIP (EXE не поддерживаем и не показываем)
   * - показываем текущую опубликованную версию (берём с /api/extensions/latest)
   *
   * Важно: версия тут НЕ обязана совпадать с версией самого фронтенда.
   */
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/extensions/latest', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        if (!cancelled) setLatestVersion(data?.version ?? null);
      } catch {
        // Молча игнорируем: UX не должен ломаться из-за метаданных
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownloadZip = () => {
    // Открываем в новой вкладке, чтобы не ломать SPA-навигацию и не блокировать UI.
    window.open('/api/extensions/download/zip', '_blank', 'noopener,noreferrer');
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

        <div className="text-xs font-bold tracking-[0.2em] uppercase text-white/30 mb-8">
          Актуальная версия:{' '}
          <span className="text-white/60">
            {latestVersion ? `v${latestVersion}` : '—'}
          </span>
        </div>
        
        <div className="flex flex-wrap gap-6">
           <button 
             onClick={handleDownloadZip}
             className="group px-10 py-5 bg-white text-black rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-50 transition-all flex items-center gap-4 shadow-2xl shadow-white/5"
           >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
              Скачать ZIP
           </button>
           
           <button 
             onClick={() => setIsModalOpen(true)}
             className="px-10 py-5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-4"
           >
              📖 Инструкция
           </button>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Установка расширения"
      >
        <div className="space-y-8 text-white/70 overflow-hidden">
          <div className="space-y-4">
            <h4 className="text-white font-black uppercase tracking-wider text-sm border-l-4 border-indigo-500 pl-4">1. Скачивание и распаковка</h4>
            <p className="leading-relaxed">
              Нажмите кнопку <span className="text-white font-bold">"Скачать ZIP"</span>. После загрузки распакуйте архив в любую удобную папку на вашем компьютере. <span className="text-indigo-400">Важно:</span> не удаляйте эту папку после установки.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-black uppercase tracking-wider text-sm border-l-4 border-indigo-500 pl-4">2. Установка в Chrome</h4>
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-white/5 text-white/40 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">a</div>
                <p>Откройте Chrome и перейдите по адресу <code className="bg-white/5 px-2 py-1 rounded text-indigo-300">chrome://extensions/</code></p>
              </div>
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-white/5 text-white/40 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">b</div>
                <p>Включите <span className="text-white font-bold">"Режим разработчика"</span> (Developer mode) в правом верхнем углу окна.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-white/5 text-white/40 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">c</div>
                <p>Нажмите <span className="text-white font-bold">"Загрузить распакованное расширение"</span> (Load unpacked) и выберите папку, в которую вы распаковали архив.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-black uppercase tracking-wider text-sm border-l-4 border-indigo-500 pl-4">3. Первый запуск</h4>
            <p className="leading-relaxed">
              Закрепите расширение в панели инструментов Chrome. Нажмите на иконку расширения и вставьте ваш <span className="text-indigo-400 font-bold">Лицензионный ключ</span> (его можно скопировать выше в личном кабинете).
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-black uppercase tracking-wider text-sm border-l-4 border-indigo-500 pl-4">4. Работа с Discord</h4>
            <p className="leading-relaxed">
              Откройте Discord в браузере, перейдите в чат с Midjourney. В расширении используйте кнопку <span className="text-indigo-300 font-bold">"Авто-поиск"</span>, чтобы система нашла поле ввода. После этого введите промпты и запустите автоматизацию.
            </p>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6">
            <p className="text-sm text-yellow-200/80 font-medium">
              ⚠️ Если поле ввода не находится автоматически, воспользуйтесь кнопкой "Ручной выбор" и кликните по полю ввода Discord.
            </p>
          </div>
        </div>
      </Modal>

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

