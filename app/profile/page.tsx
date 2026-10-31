'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Layers, Sparkles, Trophy } from 'lucide-react';
import QuizHistory, { type HistoryItem } from './QuizHistory';
import { createBrowserClient } from '@supabase/ssr';
import { normalizeQuiz } from '@/lib/quiz';
import type { User } from '@supabase/supabase-js';

interface QuizRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  created_at: string;
  content: unknown;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [rows, setRows] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function loadProfileData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      setUser(user);

      const { data } = await supabase
        .from('quizzes')
        .select('id, slug, title, description, created_at, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setRows(data as QuizRow[]);
      }
      setLoading(false);
    }

    loadProfileData();
  }, [supabase]);

  if (loading) {
    return (
      <main className="px-4 py-10 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <div className="h-96 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </main>
    );
  }

  if (!user) return null;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' });

  const items: HistoryItem[] = rows.map((row) => {
    const quiz = normalizeQuiz(row.content);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description ?? '',
      createdLabel: fmt(row.created_at),
      questionCount: quiz?.questions.length ?? 0,
      difficulty: quiz?.meta?.difficulty ?? null,
    };
  });

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const thisMonth = rows.filter((r) => new Date(r.created_at) >= monthStart).length;
  const totalQuestions = items.reduce((sum, i) => sum + i.questionCount, 0);

  const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Používateľ';
  const stats = [
    { label: 'Vytvorené kvízy', value: items.length, icon: Layers },
    { label: 'Otázky spolu', value: totalQuestions, icon: Sparkles },
    { label: 'Tento mesiac', value: thisMonth, icon: CalendarDays },
    {
      label: 'Posledný kvíz',
      value: rows[0] ? new Date(rows[0].created_at).toLocaleDateString('sk-SK') : '–',
      icon: Trophy,
    },
  ];

  return (
    <main className="px-4 py-10 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white">
            {name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold tracking-tight">{name}</h1>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
              {user.email} · člen od {fmt(user.created_at)}
            </p>
          </div>
        </header>

        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden />
              <dd className="mt-2 text-2xl font-bold">{value}</dd>
              <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>
            </div>
          ))}
        </dl>

        <QuizHistory items={items} />
      </div>
    </main>
  );
}