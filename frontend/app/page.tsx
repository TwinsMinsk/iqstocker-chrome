'use client';

import Link from 'next/link';
import { useState } from 'react';

// Icon Components with guaranteed sizes
const IconWrapper = ({ children, className = "", size = 24 }: { children: React.ReactNode, className?: string, size?: number }) => (
  <div 
    className={`inline-flex items-center justify-center flex-shrink-0 ${className}`} 
    style={{ width: `${size}px`, height: `${size}px`, minWidth: `${size}px`, minHeight: `${size}px` }}
  >
    {children}
  </div>
);

const CheckIcon = ({ size = 24 }: { size?: number }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={{ width: `${size}px`, height: `${size}px`, display: 'block' }}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const PlusIcon = ({ size = 24 }: { size?: number }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={{ width: `${size}px`, height: `${size}px`, display: 'block' }}
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const MinusIcon = ({ size = 24 }: { size?: number }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={{ width: `${size}px`, height: `${size}px`, display: 'block' }}
  >
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "Как начать пользоваться?",
      a: "Просто зарегистрируйтесь, скачайте наше Chrome расширение и авторизуйтесь. Вы сразу получите 50 бесплатных кредитов для старта."
    },
    {
      q: "Это безопасно для моего аккаунта?",
      a: "Абсолютно. Мы используем официальные методы взаимодействия через браузер, имитируя действия пользователя. Ваши данные Discord хранятся локально."
    },
    {
      q: "Можно ли отменить подписку?",
      a: "У нас нет автоматических списаний. Вы покупаете пакет кредитов один раз. Когда они закончатся, вы просто покупаете новый пакет."
    },
    {
      q: "Работает ли это с Midjourney v6?",
      a: "Да, мы поддерживаем все актуальные версии Midjourney, включая v6 и Niji mode."
    }
  ];

  return (
    <div className="bg-[#050505] text-gray-200 min-h-screen">
      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-indigo-600/10 blur-[120px] rounded-full -z-10 pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-bold tracking-widest text-indigo-300 uppercase">System Operational v2.0</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-8 leading-[1.1]">
            Automate Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
              Creative Workflow
            </span>
          </h1>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Полноценная автоматизация Midjourney. Очереди промптов, планировщик задач и управление галереей прямо в вашем браузере.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/register" 
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Начать бесплатно
            </Link>
            <Link 
              href="/login" 
              className="w-full sm:w-auto px-8 py-4 bg-[#1a1a1a] hover:bg-[#252525] text-white border border-white/5 rounded-xl font-bold transition-all"
            >
              Войти в систему
            </Link>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-20 p-2 bg-white/5 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-sm max-w-4xl mx-auto">
            <div className="aspect-[16/9] bg-[#0f0f0f] rounded-xl flex items-center justify-center border border-white/5 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-purple-500/5 opacity-50" />
              
              <div className="grid grid-cols-12 gap-4 w-3/4 opacity-80 group-hover:opacity-100 transition-opacity duration-500">
                <div className="col-span-3 space-y-3">
                  <div className="h-8 w-full bg-white/10 rounded-lg" />
                  <div className="h-4 w-2/3 bg-white/5 rounded-md" />
                  <div className="h-4 w-3/4 bg-white/5 rounded-md" />
                  <div className="h-4 w-1/2 bg-white/5 rounded-md" />
                </div>
                <div className="col-span-9 space-y-4">
                  <div className="flex gap-4">
                    <div className="h-24 w-1/3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl" />
                    <div className="h-24 w-1/3 bg-white/5 border border-white/10 rounded-xl" />
                    <div className="h-24 w-1/3 bg-white/5 border border-white/10 rounded-xl" />
                  </div>
                  <div className="h-48 w-full bg-white/5 border border-white/10 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-[#0f0f0f] border border-white/5 hover:border-indigo-500/30 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '28px', height: '28px', display: 'block' }}>
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Мгновенный старт</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                Никаких сложных настроек сервера. Установили расширение — и вы готовы генерировать шедевры.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#0f0f0f] border border-white/5 hover:border-purple-500/30 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '28px', height: '28px', display: 'block' }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Безопасность</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                Мы не требуем ваш пароль от Discord. Авторизация происходит локально через токен браузера.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#0f0f0f] border border-white/5 hover:border-pink-500/30 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-400 mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '28px', height: '28px', display: 'block' }}>
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Экономия времени</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                Загрузите 100 промптов и идите пить кофе. Система сама отправит их с нужной задержкой.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Простые тарифы</h2>
            <p className="text-gray-400">Платите только за то, что используете. Пакеты не сгорают.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Card 1 */}
            <div className="p-8 rounded-[32px] bg-[#0a0a0a] border border-white/10 flex flex-col">
              <h3 className="text-indigo-400 font-bold tracking-widest uppercase text-xs mb-4">Starter</h3>
              <div className="text-4xl font-bold text-white mb-2">€3</div>
              <p className="text-gray-500 text-sm mb-8">Идеально для пробы</p>
              
              <ul className="space-y-4 mb-8 flex-1">
                {['1,000 Кредитов', 'Базовая скорость', 'Поддержка по Email'].map((feat, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                    <IconWrapper size={20} className="text-indigo-500 mt-0.5">
                      <CheckIcon size={20} />
                    </IconWrapper>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              
              <Link href="/register" className="w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white font-bold text-center transition-colors">
                Выбрать
              </Link>
            </div>

            {/* Card 2 - Featured */}
            <div className="p-8 rounded-[32px] bg-[#121212] border border-indigo-500/50 relative shadow-[0_0_50px_rgba(79,70,229,0.1)] flex flex-col transform md:-translate-y-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                Popular
              </div>
              <h3 className="text-indigo-400 font-bold tracking-widest uppercase text-xs mb-4">Pro</h3>
              <div className="text-4xl font-bold text-white mb-2">€10</div>
              <p className="text-gray-500 text-sm mb-8">Для активных креаторов</p>
              
              <ul className="space-y-4 mb-8 flex-1">
                {['5,000 Кредитов', 'Приоритетная очередь', 'Приоритетная поддержка', 'Ранний доступ к функциям'].map((feat, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-white font-medium">
                    <IconWrapper size={20} className="text-indigo-400 mt-0.5">
                      <CheckIcon size={20} />
                    </IconWrapper>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              
              <Link href="/register" className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-center transition-colors">
                Выбрать Pro
              </Link>
            </div>

            {/* Card 3 */}
            <div className="p-8 rounded-[32px] bg-[#0a0a0a] border border-white/10 flex flex-col">
              <h3 className="text-indigo-400 font-bold tracking-widest uppercase text-xs mb-4">Ultimate</h3>
              <div className="text-4xl font-bold text-white mb-2">€17</div>
              <p className="text-gray-500 text-sm mb-8">Максимальная выгода</p>
              
              <ul className="space-y-4 mb-8 flex-1">
                {['10,000 Кредитов', 'Максимальная скорость', 'Персональный менеджер', 'API Доступ (beta)'].map((feat, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                    <IconWrapper size={20} className="text-indigo-500 mt-0.5">
                      <CheckIcon size={20} />
                    </IconWrapper>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              
              <Link href="/register" className="w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white font-bold text-center transition-colors">
                Выбрать
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0a0a0a]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Частые вопросы</h2>
          
          <div className="space-y-4">
            {faqs.map((item, idx) => (
              <div key={idx} className="bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden">
                <button 
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                >
                  <span className="font-medium text-gray-200 pr-4">{item.q}</span>
                  <IconWrapper size={24} className={`text-gray-400 transition-transform duration-300 flex-shrink-0 ${openFaq === idx ? 'rotate-180' : ''}`}>
                    {openFaq === idx ? <MinusIcon size={24} /> : <PlusIcon size={24} />}
                  </IconWrapper>
                </button>
                
                {openFaq === idx && (
                  <div className="px-6 pb-6 pt-0 text-gray-400 text-sm leading-relaxed animate-fade-in">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
