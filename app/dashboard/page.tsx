'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import GenerateForm from './GenerateForm';
import { createBrowserClient } from '@supabase/ssr';
import { DIFFICULTY_LABELS, normalizeQuiz } from '@/lib/quiz';

interface QuizRow {
  slug: string;
  title: string;
  created_at: string;
  content: unknown;
}

export default function DashboardPage() {
  return (
    <main className="px-4 py-10 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight">Nový kvíz</h1>
          <p className="text-slate-600 dark:text-slate-400">Vlož text, vyber náročnosť a AI z neho vytvorí interaktívny kvíz.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
          <GenerateForm />
        </div>

        <RecentQuizzes />
      </div>
    </main>
  );
}

function RecentQuizzes() {
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function loadQuizzes() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('quizzes')
        .select('slug, title, created_at, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        setQuizzes(data as QuizRow[]);
      }
      setLoading(false);
    }

    loadQuizzes();
  }, [supabase]);

  if (loading) {
    return <div className="mt-10 h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />;
  }

  if (!quizzes.length) return null;

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Posledné kvízy</h2>
        <Link href="/profile" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Celá história <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {quizzes.map((row) => {
          const quiz = normalizeQuiz(row.content);
          const difficulty = quiz?.meta?.difficulty;
          return (
            <li key={row.slug}>
              <Link href={`/q/${row.slug}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{row.title}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {quiz ? `${quiz.questions.length} otázok` : 'Poškodený kvíz'}
                    {difficulty ? ` · ${DIFFICULTY_LABELS[difficulty]}` : ''}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-slate-400">{new Date(row.created_at).toLocaleDateString('sk-SK')}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}