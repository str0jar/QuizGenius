'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RotateCcw, Sparkles, TriangleAlert } from 'lucide-react';
import {
  DEFAULT_COUNT,
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  MAX_TEXT_LENGTH,
  MIN_TEXT_LENGTH,
  QUESTION_COUNTS,
  type Difficulty,
  type QuestionCount,
} from '@/lib/quiz';

type FormError = { message: string; code?: string };

function Segmented<T extends string | number>({
  legend,
  name,
  value,
  options,
  onChange,
  disabled,
}: {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">{legend}</legend>
      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
        {options.map((o) => (
          <label key={String(o.value)} className="relative">
            <input
              type="radio"
              name={name}
              value={String(o.value)}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span className="block cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition peer-checked:bg-indigo-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2 peer-disabled:opacity-60 dark:text-slate-300 dark:peer-focus-visible:ring-offset-slate-900">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function GenerateForm() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [questionCount, setQuestionCount] = useState<QuestionCount>(DEFAULT_COUNT);
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FormError | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // odpočet po dočasnej chybe (503 / 429)
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  async function generate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, questionCount, difficulty }),
      });
      const data: { slug?: string; error?: string; code?: string; retryAfter?: number } = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push('/login?next=/dashboard');
        return;
      }
      if (!res.ok || !data.slug) {
        setError({ message: data.error ?? 'Niečo sa pokazilo. Skús to znova.', code: data.code });
        if (data.code === 'AI_OVERLOADED' || data.code === 'AI_RATE_LIMITED') setCooldown(data.retryAfter ?? 15);
        return;
      }
      router.push(`/q/${data.slug}`);
    } catch {
      setError({ message: 'Nepodarilo sa spojiť so serverom. Skontroluj pripojenie na internet.', code: 'NETWORK' });
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length >= MIN_TEXT_LENGTH && cooldown === 0) void generate();
  }

  const temporary = error?.code === 'AI_OVERLOADED' || error?.code === 'AI_RATE_LIMITED';
  const tooShort = text.trim().length < MIN_TEXT_LENGTH;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label htmlFor="text-input" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Študijný text alebo poznámky
        </label>
        <textarea
          id="text-input"
          rows={9}
          value={text}
          maxLength={MAX_TEXT_LENGTH}
          onChange={(e) => setText(e.target.value)}
          placeholder="Sem skopíruj text z prednášky, článku alebo učebnice…"
          className="w-full rounded-xl border border-slate-300 bg-white p-4 text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          required
        />
        <p className="mt-1.5 text-right text-xs text-slate-500 dark:text-slate-400">
          {text.length.toLocaleString('sk-SK')} / {MAX_TEXT_LENGTH.toLocaleString('sk-SK')} znakov
        </p>
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-4">
        <Segmented
          legend="Počet otázok"
          name="questionCount"
          value={questionCount}
          onChange={setQuestionCount}
          disabled={loading}
          options={QUESTION_COUNTS.map((n) => ({ value: n, label: String(n) }))}
        />
        <Segmented
          legend="Náročnosť"
          name="difficulty"
          value={difficulty}
          onChange={setDifficulty}
          disabled={loading}
          options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }))}
        />
      </div>

      {error && temporary && (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
          <div className="flex gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium">{error.code === 'AI_OVERLOADED' ? 'AI je práve preťažená' : 'Dosiahol sa limit AI'}</p>
              <p className="mt-1 text-sm">{error.message}</p>
              <button
                type="button"
                onClick={() => void generate()}
                disabled={cooldown > 0 || loading}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                {cooldown > 0 ? `Skúsiť znova (${cooldown} s)` : 'Skúsiť znova'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && !temporary && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
          {error.message}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || tooShort || cooldown > 0}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Generujem kvíz…
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" aria-hidden />
            Vygenerovať kvíz
          </>
        )}
      </button>
    </form>
  );
}
