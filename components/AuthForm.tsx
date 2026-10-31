'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type Mode = 'login' | 'register';

const COPY = {
  login: {
    title: 'Prihlásenie',
    submit: 'Prihlásiť sa',
    switchText: 'Nemáš účet?',
    switchLink: 'Zaregistruj sa',
    switchHref: '/register',
  },
  register: {
    title: 'Vytvoriť účet',
    submit: 'Zaregistrovať sa',
    switchText: 'Už máš účet?',
    switchLink: 'Prihlás sa',
    switchHref: '/login',
  },
} as const;

function translateError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Nesprávny e-mail alebo heslo.';
  if (/email not confirmed/i.test(message)) return 'E-mail ešte nie je potvrdený. Skontroluj schránku.';
  if (/already registered|already been registered/i.test(message)) return 'Účet s týmto e-mailom už existuje.';
  if (/password should be at least/i.test(message)) return 'Heslo je príliš krátke.';
  if (/rate limit|too many/i.test(message)) return 'Príliš veľa pokusov. Skús to o chvíľu.';
  return message;
}

export default function AuthForm({ mode, next, initialError }: { mode: Mode; next: string; initialError?: string }) {
  const router = useRouter();
  const copy = COPY[mode];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [info, setInfo] = useState<string | null>(null);

  const callbackUrl = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (mode === 'register' && password.length < 8) {
      setError('Heslo musí mať aspoň 8 znakov.');
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(translateError(error.message));
        setLoading(false);
        return;
      }
      router.replace(next);
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callbackUrl() },
    });
    if (error) {
      setError(translateError(error.message));
      setLoading(false);
      return;
    }
    // Pri zapnutom potvrdzovaní e-mailov Supabase pre existujúci e-mail vráti používateľa bez identít.
    if (data.user && data.user.identities?.length === 0) {
      setError('Účet s týmto e-mailom už existuje. Skús sa prihlásiť.');
      setLoading(false);
      return;
    }
    if (data.session) {
      router.replace(next);
      router.refresh();
      return;
    }
    setInfo(`Poslali sme potvrdzovací odkaz na ${email}. Po potvrdení sa budeš môcť prihlásiť.`);
    setLoading(false);
  }

  async function signInWithGoogle() {
    setError(null);
    setGoogleLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl() },
    });
    if (error) {
      setError(translateError(error.message));
      setGoogleLoading(false);
    }
    // pri úspechu prehliadač odíde na Google
  }

  const inputClass =
    'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-2 focus:outline-indigo-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16">
      <h1 className="text-center text-2xl font-bold tracking-tight">{copy.title}</h1>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={googleLoading || loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          {googleLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
          )}
          Pokračovať cez Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          alebo e-mailom
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Heslo
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={mode === 'register' ? 8 : undefined}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            {mode === 'register' && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Aspoň 8 znakov.</p>}
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {error}
            </p>
          )}
          {info && (
            <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {copy.submit}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        {copy.switchText}{' '}
        <Link
          href={`${copy.switchHref}${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          {copy.switchLink}
        </Link>
      </p>
    </div>
  );
}
