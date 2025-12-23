'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link 
            href="/" 
            className="flex items-center gap-2 group"
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-xl shadow-[0_0_20px_rgba(79,70,229,0.4)] group-hover:scale-110 transition-transform text-white">IQ</div>
            <span className="text-xl font-black tracking-tighter text-white">STOCKER<span className="text-white/40">AUTO</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-10">
            <Link href="/#features" className="text-xs font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest">Features</Link>
            <Link href="/#pricing" className="text-xs font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest">Pricing</Link>
            <Link href="/#faq" className="text-xs font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest">FAQ</Link>
          </nav>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-6">
                <Link
                  href="/dashboard"
                  className="hidden sm:block text-xs font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all text-[10px] font-black uppercase tracking-widest"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="px-6 py-2.5 text-xs font-bold text-white/60 hover:text-white transition-all uppercase tracking-widest"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] font-black text-[10px] uppercase tracking-widest"
                >
                  Join Now
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

