'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Check, ExternalLink, Link2, Loader2, Search, Trash2 } from 'lucide-react';
import { DIFFICULTY_LABELS, type Difficulty } from '@/lib/quiz';
import { deleteQuiz } from './actions';

export interface HistoryItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  createdLabel: string;
  questionCount: number;
  difficulty: Difficulty | null;
}

/** Vyhľadávanie bez ohľadu na diakritiku: "kviz" nájde "Kvíz". */
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const actionClass =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800';

export default function QuizHistory({ items: initial }: { items: HistoryItem[] }) {
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return items;
    return items.filter((i) => fold(`${i.title} ${i.description}`).includes(q));
  }, [items, query]);

  async function copyLink(slug: string, id: string) {
    const url = `${window.location.origin}/q/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Skopíruj odkaz:', url);
      return;
    }
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 2000);
  }

  function remove(id: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const res = await deleteQuiz(id);
      setPendingId(null);
      setConfirmId(null);
      if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
      else setError(res.error ?? 'Kvíz sa nepodarilo zmazať.');
    });
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">História kvízov</h2>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <label htmlFor="history-search" className="sr-only">
            Hľadať v kvízoch
          </label>
          <input
            id="history-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hľadať v kvízoch…"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="text-slate-600 dark:text-slate-400">Zatiaľ nemáš žiadny kvíz.</p>
          <Link href="/dashboard" className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
            Vytvoriť prvý kvíz
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 p-8 text-center text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Pre „{query}“ sa nenašiel žiadny kvíz.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <h3 className="min-w-0 font-semibold">{item.title}</h3>
                <span className="shrink-0 text-sm text-slate-400">{item.createdLabel}</span>
              </div>
              {item.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{item.description}</p>}
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {item.questionCount} otázok{item.difficulty ? ` · ${DIFFICULTY_LABELS[item.difficulty]}` : ''}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link href={`/q/${item.slug}`} className={actionClass}>
                  <ExternalLink className="h-4 w-4" aria-hidden /> Otvoriť
                </Link>
                <button type="button" onClick={() => void copyLink(item.slug, item.id)} className={actionClass}>
                  {copiedId === item.id ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
                  {copiedId === item.id ? 'Skopírované' : 'Skopírovať odkaz'}
                </button>

                {confirmId === item.id ? (
                  <span className="ml-auto inline-flex items-center gap-2 text-sm">
                    <span className="text-slate-600 dark:text-slate-300">Naozaj zmazať?</span>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      disabled={pendingId === item.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {pendingId === item.id && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                      Zmazať
                    </button>
                    <button type="button" onClick={() => setConfirmId(null)} disabled={pendingId === item.id} className={actionClass}>
                      Zrušiť
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(item.id)}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden /> Zmazať
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
