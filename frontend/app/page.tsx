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
      q: "Есть ли пробный период?",
      a: "Да, после регистрации вам автоматически начислятся 50 бесплатных кредитов. Вы можете использовать их в любое время, чтобы проверить работу сервиса."
    },
    {
      q: "Как начать пользоваться?",
      a: "Просто зарегистрируйтесь, следуйте инструкциям и запустите свой первый автогенеринг."
    },
    {
      q: "В безопасности ли мои данные?",
      a: "Да. ваши данные в безопасности.\nРасширение создано для одной задачи - автоматизировать отправку промптов. Оно не следит за вами и не собирает личную информацию.\nУ расширения ограниченные права доступа.\nЭто значит, что оно может работать только на конкретных сайтах, которые указаны в настройках Chrome, и только для своей функции. Все эти разрешения прозрачны и видны пользователю - вы можете проверить их в любой момент."
    },
    {
      q: "Могут ли быть проблемы с Midjourney?",
      a: "На данный момент Midjourney официально не разрешает прямую автоматизацию генерации. Поэтому любые инструменты автогенеринга, включая наш, не могут быть на 100% гарантированно безопасными с точки зрения правил Midjourney.\n\nЧто важно: мы сделали всё возможное, чтобы минимизировать риск блокировок. Во время тестирования сервиса с нашей стороны - у нас не было ни одного случая, за более чем 6 месяцев тестов.\n\nМы не скрываем ограничения и не обещаем невозможного. Наша задача - дать инструмент и честно объяснить все нюансы."
    },
    {
      q: "Это подписка или разовый платеж?",
      a: "Это не подписка, у нас нету ежемесячных или автоматических списаний.\nВы покупаете пакет кредитов один раз. Когда они закончатся, вы просто покупаете новый пакет."
    },
    {
      q: "Как можно оплатить?",
      a: "Вы можете оплатить любой картой, любого банка, любой страны.\nОплата проходит через Tribute - официальный платёжный сервис внутри Telegram."
    }
  ];

  const [selectedCredits, setSelectedCredits] = useState(500);

  const creditOptions = [
    { id: 'credit_500', amount: 500, price: 2, discount: null },
    { id: 'credit_1000', amount: 1000, price: 3.6, discount: '-10%' },
    { id: 'credit_2000', amount: 2000, price: 6.4, discount: '-20%' },
    { id: 'credit_5000', amount: 5000, price: 14, discount: '-30%' },
  ];

  const currentOption = creditOptions.find(opt => opt.amount === selectedCredits) || creditOptions[0];

  return (
    <div className="bg-[#050505] text-gray-200 min-h-screen">
      {/* ... existing hero and features ... */}
      {/* (I will replace the pricing section below) */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-indigo-600/10 blur-[120px] rounded-full -z-10 pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold tracking-widest text-green-300 uppercase">Система работает</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-8 leading-[1.1]">
            Автоматизируйте свой <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 font-extrabold">
              ГЕНЕРИНГ
            </span>
          </h1>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Полноценная автоматизация генеринга прямо в вашем браузере.
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
          <div id="features" className="mt-20 p-2 bg-white/5 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-sm max-w-4xl mx-auto">
            <div className="aspect-[16/9] bg-[#0f0f0f] rounded-xl flex flex-col items-center justify-center border border-white/5 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-purple-500/5 opacity-50" />
              
              <div className="z-10 flex flex-col items-center gap-6 p-8 text-center opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-2xl group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white tracking-tight">Смотреть видео</h3>
                  <p className="text-sm text-gray-400">Узнайте как запустить генеринг за 60 секунд</p>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#0f0f0f] to-transparent pointer-events-none" />
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
                Никаких сложных настроек. Устанавливаете расширение - и вы готовы генерировать шедевры.
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
                Мы не требуем ваш пароль от Discord, не отслеживаем ваши действия и не имеем никакого доступа к вашим личным данным.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#0f0f0f] border border-white/5 hover:border-green-500/30 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400 mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '28px', height: '28px', display: 'block' }}>
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Экономия времени</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                Загрузите свои промты и идите пить кофе. Все остальное система сделает за вас.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION - CREDIT BASED */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 border-y border-white/5 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[600px] bg-indigo-600/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-8">
              Забудьте про ежемесячные подписки
            </h2>
            
            <div className="inline-block text-left space-y-4 mb-16">
              {[
                'Покупайте столько кредитов, сколько Вам нужно',
                'Без ежемесячных платежей и автосписаний',
                'Пополняйте баланс в любое время',
                'Кредиты можно использовать без ограничения по времени',
                'Чем больше кредитов покупаете - тем выгоднее цена',
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-4 text-base md:text-lg font-medium text-white/90">
                  <div className="flex-shrink-0 w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  {text}
                </div>
              ))}
            </div>

            {/* Credit Selector Card */}
            <div className="relative group max-w-xl mx-auto">
              {/* Animated glow border */}
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-500 rounded-[40px] blur-xl opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              
              <div className="relative bg-[#0a0a0c] rounded-[38px] p-8 md:p-12 border border-white/10 shadow-2xl backdrop-blur-xl">
                <h3 className="text-indigo-400 font-bold uppercase tracking-widest text-xs mb-3">
                  Выберите сколько кредитов Вам нужно
                </h3>
                <p className="text-white/60 text-xs mb-10">
                  1 кредит = 1 отправленный промт
                </p>

                {/* Credit Buttons Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                  {creditOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedCredits(option.amount)}
                      className={`relative py-4 px-2 rounded-2xl border transition-all font-black text-xl flex flex-col items-center justify-center ${
                        selectedCredits === option.amount
                          ? 'bg-indigo-600/10 border-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.2)]'
                          : 'bg-white/5 border-white/10 text-white/30 hover:border-white/20 hover:text-white/50'
                      }`}
                    >
                      {option.amount}
                      {option.discount && (
                        <span className={`absolute -top-2 -right-2 ${option.amount === 5000 ? 'bg-red-600' : option.amount === 2000 ? 'bg-orange-500' : 'bg-orange-500'} text-white text-[9px] px-2 py-0.5 rounded-full transform rotate-12 font-black shadow-lg`}>
                          {option.discount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="mb-12">
                  <div className="text-white/40 text-xs font-black uppercase tracking-[0.2em] mb-3">Стоимость</div>
                  <div className="text-7xl font-black text-white tracking-tighter">
                    {currentOption.price.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} <span className="text-3xl ml-1 text-white/50 tracking-normal">€</span>
                  </div>
                </div>

                <Link
                  href="/register"
                  className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black py-6 rounded-2xl text-xl transition-all shadow-[0_10px_40px_rgba(79,70,229,0.3)] hover:shadow-[0_15px_50px_rgba(79,70,229,0.4)] active:scale-[0.98]"
                >
                  Купить кредиты
                </Link>
                
                <p className="mt-6 text-[10px] text-white/20 font-bold uppercase tracking-widest text-center">
                  Нажимая кнопку «Купить кредиты», вы соглашаетесь с{' '}
                  <Link href="/offer" className="text-white/40 hover:text-white/60 underline">
                    условиями Оферты
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0a0a0a]">
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
                  <div className="px-6 pb-6 pt-0 text-gray-400 text-sm leading-relaxed animate-fade-in whitespace-pre-line">
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
