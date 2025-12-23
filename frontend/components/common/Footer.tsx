'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#050505] border-t border-white/5 text-white py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 md:gap-8">
          <div className="col-span-1 md:col-span-1">
            <h3 className="text-xl font-black mb-6 tracking-tighter uppercase italic">IQSTOCKER<span className="text-white/40">AUTO</span></h3>
            <p className="text-white/30 text-xs font-bold leading-relaxed uppercase tracking-widest max-w-xs">
              Профессиональная автоматизация для цифровых художников. 
              Экономим ваше время с 2025 года.
            </p>
          </div>

          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-8">Product</h4>
            <ul className="space-y-4 text-[10px] font-bold uppercase tracking-widest">
              <li><Link href="/#features" className="text-white/40 hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/#pricing" className="text-white/40 hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/#faq" className="text-white/40 hover:text-white transition-colors">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-8">Support</h4>
            <ul className="space-y-4 text-[10px] font-bold uppercase tracking-widest">
              <li><Link href="/docs" className="text-white/40 hover:text-white transition-colors">Documentation</Link></li>
              <li><Link href="/contact" className="text-white/40 hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="https://t.me/your_support" className="text-white/40 hover:text-white transition-colors">Telegram</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-8">Legal</h4>
            <ul className="space-y-4 text-[10px] font-bold uppercase tracking-widest">
              <li><Link href="/privacy" className="text-white/40 hover:text-white transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="text-white/40 hover:text-white transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-24 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">
            &copy; {new Date().getFullYear()} IQStocker Auto. Digital Forge.
          </p>
          <div className="flex gap-8 items-center">
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Operational</span>
             </div>
          </div>
        </div>
      </div>
    </footer>
  );
}



