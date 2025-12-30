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
  const [versionLoading, setVersionLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Запрашиваем JSON напрямую как статический файл
        // Это надежнее, чем читать файл на сервере через API route в Docker/Standalone окружении
        const res = await fetch('/downloads/extension/latest.json', { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          }
        });
        
        if (!res.ok) {
          console.warn('Failed to fetch extension version:', res.status, res.statusText);
          return;
        }
        
        const data = (await res.json()) as { version?: string; error?: string };
        
        if (data.error) {
          console.warn('Extension version API error:', data.error);
          return;
        }
        
        if (!cancelled && data.version) {
          setLatestVersion(data.version);
        }
      } catch (error) {
        console.error('Error fetching extension version:', error);
        // Молча игнорируем: UX не должен ломаться из-за метаданных
      } finally {
        if (!cancelled) {
          setVersionLoading(false);
        }
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Левая часть - Скачивание */}
      <div className="bg-gradient-to-br from-indigo-900/20 to-black border border-white/5 rounded-[40px] p-12 relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(79,70,229,0.1),transparent)]"></div>
        
        <div className="relative z-10">
          <h3 className="text-xs font-black tracking-[0.4em] text-indigo-400 uppercase mb-6">Инструментарий</h3>
          <h4 className="text-4xl md:text-5xl font-black text-white mb-8 tracking-tighter uppercase leading-[0.9]">
            Chrome<br/>
            <span className="text-white/20 tracking-[-0.05em]">Расширение</span>
          </h4>
          <p className="text-lg text-white/40 font-light leading-relaxed mb-10">
            Скачайте расширение IQСтокер Генеринг.
          </p>

          <div className="text-xs font-bold tracking-[0.2em] uppercase text-white/30 mb-8">
            Актуальная версия:{' '}
            <span className="text-indigo-300 border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 rounded-lg inline-block font-semibold">
              {versionLoading ? 'Загрузка...' : latestVersion ? `v${latestVersion}` : '—'}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-4">
             <button 
               onClick={handleDownloadZip}
               className="group px-8 py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-50 transition-all flex items-center gap-3 shadow-2xl shadow-white/5"
             >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
                Скачать ZIP
             </button>
             
             <button 
               onClick={() => setIsModalOpen(true)}
               className="px-8 py-4 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-3"
             >
                📖 Инструкция
             </button>
          </div>
        </div>
      </div>

      {/* Правая часть - Рекомендации */}
      <div className="bg-[#0a0a0f] border border-white/5 rounded-[40px] p-12 relative overflow-hidden flex flex-col">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px]"></div>
        
        <div className="relative z-10">
          <h3 className="text-xs font-black tracking-[0.4em] text-yellow-500/80 uppercase mb-8 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
            Рекомендации по работе
          </h3>
          
          <ul className="space-y-6">
            <li className="flex gap-5 group">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/20 group-hover:border-indigo-500/40 transition-colors">1</div>
              <div className="flex-1">
                <h5 className="text-white font-bold mb-1">Лимит запросов</h5>
                <p className="text-sm text-white/50 leading-relaxed">Не отправляйте более <span className="text-indigo-300 font-bold">300 промптов</span> в день на один аккаунт Midjourney.</p>
              </div>
            </li>
            <li className="flex gap-5 group">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/20 group-hover:border-indigo-500/40 transition-colors">2</div>
              <div className="flex-1">
                <h5 className="text-white font-bold mb-1">Интервалы генерации</h5>
                <p className="text-sm text-white/50 leading-relaxed">Рекомендуемый интервал между запросами - <span className="text-indigo-300 font-bold">от 30 до 60 секунд</span>.</p>
              </div>
            </li>
            <li className="flex gap-5 group">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/20 group-hover:border-indigo-500/40 transition-colors">3</div>
              <div className="flex-1">
                <h5 className="text-white font-bold mb-1">Режим работы</h5>
                <p className="text-sm text-white/50 leading-relaxed">Распределяйте генеринг равномерно в течение недели и делайте <span className="text-indigo-300 font-bold">1-2 выходных</span> каждую неделю.</p>
              </div>
            </li>
             <li className="flex gap-5 group">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/20 group-hover:border-indigo-500/40 transition-colors">4</div>
              <div className="flex-1">
                <h5 className="text-white font-bold mb-1">После запуска генеринга</h5>
                <p className="text-sm text-white/50 leading-relaxed">Чтобы убедиться, что в <span className="text-indigo-300 font-bold">ваших промптах</span> нет ошибок, проверьте корректно ли отправляются первые несколько промптов.</p>
              </div>
            </li>
          </ul>
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
    </div>
  );
}
