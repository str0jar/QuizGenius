import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import QuizPlayer from './QuizPlayer';
import { supabase } from '@/lib/supabase';
import { DIFFICULTY_LABELS, normalizeQuiz } from '@/lib/quiz';

export const metadata = { title: 'Kvíz · QuizGenius' };

export default function QuizPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <main className="px-4 py-10 sm:py-12">
      {/* params + databáza sú údaje z requestu → vnútri <Suspense> (Cache Components) */}
      <Suspense fallback={<div className="mx-auto h-96 max-w-2xl animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />}>
        <QuizContent params={params} />
      </Suspense>
    </main>
  );
}

async function QuizContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Verejné čítanie bez prihlásenia (RLS politika "select using (true)")
  const { data: row } = await supabase.from('quizzes').select('title, description, content').eq('slug', slug).maybeSingle();
  if (!row) notFound();

  const quiz = normalizeQuiz(row.content);
  if (!quiz) notFound();

  const difficulty = quiz.meta?.difficulty;

  return (
    <>
      <div className="mx-auto mb-8 max-w-2xl text-center print:hidden">
        <h1 className="text-3xl font-extrabold tracking-tight">{row.title}</h1>
        {row.description && <p className="mt-2 text-slate-600 dark:text-slate-400">{row.description}</p>}
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">
          {quiz.questions.length} otázok{difficulty ? ` · ${DIFFICULTY_LABELS[difficulty]}` : ''}
        </p>
      </div>
      <QuizPlayer quiz={{ ...quiz, title: row.title, description: row.description ?? quiz.description }} />
    </>
  );
}
