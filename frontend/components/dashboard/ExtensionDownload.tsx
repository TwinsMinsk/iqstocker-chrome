'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  const StepImage = ({ src, alt }: { src: string; alt: string }) => (
    <div 
      className="relative group cursor-zoom-in w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-white/10 hover:border-indigo-500 transition-all"
      onClick={() => setSelectedImage(src)}
    >
      <img src={src} alt={alt} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
      <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/20 transition-colors flex items-center justify-center">
        <svg className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
      </div>
    </div>
  );

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
        title="КАК РАБОТАТЬ С РАСШИРЕНИЕМ"
      >
        <div className="space-y-8 text-white/70 overflow-hidden">
          {/* 1. Скачивание и распаковка */}
          <div className="space-y-4">
            <h4 className="text-white font-black uppercase tracking-wider text-sm border-l-4 border-indigo-500 pl-4">1. Скачивание и распаковка</h4>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <p className="leading-relaxed">
                  Нажмите кнопку <span className="text-white font-bold">"Скачать ZIP"</span>.
                </p>
                <StepImage src="/instructions/step-1.png" alt="Скриншот 1" />
              </div>
              
              <div className="flex flex-col gap-3">
                <p className="leading-relaxed">
                  После загрузки распакуйте архив в любое удобное место на вашем компьютере. <span className="text-indigo-400 font-bold">Важно:</span> не удаляйте эту папку после установки.
                </p>
                <StepImage src="/instructions/step-2.png" alt="Скриншот 2" />
              </div>
            </div>
          </div>

          {/* 2. Установка в Chrome */}
          <div className="space-y-4">
            <h4 className="text-white font-black uppercase tracking-wider text-sm border-l-4 border-indigo-500 pl-4">2. Установка в Chrome</h4>
            <div className="space-y-6">
              <div className="flex flex-col gap-3">
                <p className="leading-relaxed">Откройте браузер Chrome (если у вас его нет - скачайте и установите его) и перейдите по адресу <code className="bg-white/5 px-2 py-1 rounded text-indigo-300">chrome://extensions/</code> (для этого скопируйте адрес и вставьте его в браузер).</p>
                <StepImage src="/instructions/step-3.png" alt="Скриншот 3" />
              </div>
              
              <div className="flex flex-col gap-3">
                <p className="leading-relaxed">Включите <span className="text-white font-bold">"Режим разработчика"</span> (Developer mode) в правом верхнем углу.</p>
                <StepImage src="/instructions/step-4.png" alt="Скриншот 4" />
              </div>

              <div className="flex flex-col gap-3">
                <p className="leading-relaxed">Нажмите <span className="text-white font-bold">"Загрузить распакованное расширение"</span> (Load unpacked) и выберите папку, в которую вы распаковали архив.</p>
                <StepImage src="/instructions/step-5.png" alt="Скриншот 5" />
              </div>
            </div>
          </div>

          {/* 3. Первый запуск */}
          <div className="space-y-4">
            <h4 className="text-white font-black uppercase tracking-wider text-sm border-l-4 border-indigo-500 pl-4">3. Первый запуск</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                 <div className="flex-1">
                   <p className="mb-2">Закрепите расширение в панели инструментов Chrome.</p>
                   <StepImage src="/instructions/step-6.png" alt="Скриншот 6" />
                 </div>
              </div>
              <div className="flex items-start gap-4">
                 <div className="flex-1">
                   <p className="mb-2">Нажмите на иконку расширения и вставьте ваш <span className="text-indigo-400 font-bold">Лицензионный ключ</span> (его можно скопировать в личном кабинете) и нажмите применить.</p>
                   <StepImage src="/instructions/step-7.png" alt="Скриншот 7" />
                 </div>
              </div>
            </div>
          </div>

          {/* 4. Работа с Discord */}
          <div className="space-y-4">
            <h4 className="text-white font-black uppercase tracking-wider text-sm border-l-4 border-indigo-500 pl-4">4. Работа с Discord</h4>
            <div className="space-y-6">
              <p className="leading-relaxed">
                Откройте Discord в браузере Chrome, перейдите в чат с Midjourney, куда отправляются промпты.<br/>
                Откройте расширение и вставьте свои промпты, нажмите кнопку <span className="text-white font-bold">"Форматировать"</span>.
              </p>

              <div className="flex flex-col gap-2">
                 <p className="leading-relaxed">
                   Нажмите кнопку <span className="text-white font-bold">"Авто-поиск"</span>, чтобы система нашла поле ввода. После этого установите интервал (рекомендуемое значение <span className="text-indigo-300 font-bold">от 30 до 60 сек</span>) и нажмите <span className="text-green-400 font-bold">"start"</span>.
                 </p>
                 <StepImage src="/instructions/step-9.png" alt="Скриншот 9" />
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
                <p className="text-sm text-yellow-200/80 font-medium leading-relaxed">
                  ⚠️ На этом этапе, если поле ввода не находится автоматически, воспользуйтесь кнопкой <span className="text-white font-bold">"Ручной выбор"</span> и кликните по полю куда нужно вставлять промпты.
                </p>
              </div>

              <p className="leading-relaxed">
                Автогенеринг должен начаться. Проверьте отправляются ли первые несколько промптов, чтобы убедиться что в них нету ошибок.
              </p>

              <div className="flex flex-col gap-2">
                 <p className="leading-relaxed">
                    После начала автогенеринга, вы сможете следить за количеством отправленных промптов.
                 </p>
                 <StepImage src="/instructions/step-10.png" alt="Скриншот 10" />
              </div>

              <div className="flex flex-col gap-2">
                 <p className="leading-relaxed">
                    При необходимости, вы можете поставить генеринг на паузу или остановить его нажав кнопки <span className="text-white font-bold">"Pause/Stop"</span>.
                 </p>
                 <StepImage src="/instructions/step-11.png" alt="Скриншот 11" />
              </div>

              <p className="leading-relaxed border-l-2 border-green-500/50 pl-4 text-green-200/80">
                После отправки последнего промпта статус генеринга поменяется на - <span className="font-bold">Завершено</span>.
              </p>
            </div>
          </div>
          
          <div className="h-px bg-white/10 my-8"></div>

          <div className="space-y-4">
             <p className="leading-relaxed">
               Чтобы запустить новый генеринг удалите старые промпты из расширения и вставьте на их место новые → нажмите кнопку <span className="text-white/70 font-bold">форматировать</span> → нажмите кнопку <span className="text-white/70 font-bold">"Авто-поиск"</span> → проверьте интервал.
               Нажмите <span className="text-white/70 font-bold">"Start"</span>, и автогенеринг должен будет начаться.
             </p>
             <p className="leading-relaxed">
               Баланс ваших кредитов вы в любое время можете посмотреть в своем личном кабинете.
             </p>
             <p className="leading-relaxed">
               При возникновении любых вопросов, пожалуйста, пишите в нашу техподдержку <a href="https://t.me/iqstockersupport" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">@iqstockersupport</a>
             </p>
             <p className="text-center pt-4 text-white/30 font-bold uppercase tracking-widest text-sm">
               Спасибо и приятного вам использования!
             </p>
          </div>
        </div>
      </Modal>

      {/* Lightbox with Portal for higher Z-index */}
      {mounted && selectedImage && createPortal(
        <div 
          className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 cursor-zoom-out"
          onClick={() => setSelectedImage(null)}
        >
          <img 
            src={selectedImage} 
            alt="Full size" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()} 
          />
          <button 
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
