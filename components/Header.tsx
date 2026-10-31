'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';

const linkClass =
  'rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80 print:hidden">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-indigo-600 dark:text-indigo-400">
          <Sparkles className="h-6 w-6" aria-hidden />
          <span className="hidden sm:inline">QuizGenius</span>
        </Link>

        <nav className="ml-2 flex items-center sm:ml-6" aria-label="Hlavná navigácia">
          <Link href="/dashboard" className={linkClass}>
            Dashboard
          </Link>
          <Link href="/profile" className={linkClass}>
            Profil
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Suspense fallback={<div className="h-9 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
