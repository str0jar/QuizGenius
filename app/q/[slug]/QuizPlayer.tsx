'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, Clock, Copy, FileDown, RotateCcw, XCircle } from 'lucide-react';
import { DIFFICULTY_LABELS, type QuizData } from '@/lib/quiz';

const LETTERS = ['A', 'B', 'C', 'D'] as const;

const formatTime = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

function optionClasses(i: number, selected: number | null, correct: number) {
  const base =
    'flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-indigo-500';
  if (selected === null)
    return `${base} border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-400 dark:hover:bg-slate-800`;
  if (i === correct)
    return `${base} border-emerald-500 bg-emerald-50 font-medium text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-100`;
  if (i === selected)
    return `${base} border-red-500 bg-red-50 text-red-900 dark:border-red-500 dark:bg-red-950/60 dark:text-red-100`;
  return `${base} border-slate-200 bg-white opacity-50 dark:border-slate-700 dark:bg-slate-900`;
}

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600';
const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';

export default function QuizPlayer({ quiz }: { quiz: QuizData }) {
  const total = quiz.questions.length;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array<number | null>(total).fill(null));
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [runId, setRunId] = useState(0);
  const [copied, setCopied] = useState(false);
  const startRef = useRef<number | null>(null);

  const question = quiz.questions[index];
  const selected = answers[index];
  const answered = selected !== null;
  const isLast = index === total - 1;
  const score = answers.reduce<number>((sum, a, i) => (a === quiz.questions[i].correctOptionIndex ? sum + 1 : sum), 0);
  const percent = Math.round((score / total) * 100);

  // ---- Stopky: bežia od načítania kvízu, zastavia sa po poslednej otázke ----
  useEffect(() => {
    if (finished) return;
    if (startRef.current === null) startRef.current = Date.now();
    const id = window.setInterval(() => {
      if (startRef.current !== null) setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [finished, runId]);

  // ---- Konfety pri dobrom výsledku (min. 70 %), rešpektuje "reduced motion" ----
  useEffect(() => {
    if (!finished || percent < 70) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelled = false;
    void import('canvas-confetti').then(({ default: confetti }) => {
      if (cancelled) return;
      const end = Date.now() + (percent === 100 ? 2500 : 1200);
      const frame = () => {
        if (cancelled) return;
        confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.8 } });
        confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.8 } });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    });
    return () => {
      cancelled = true;
    };
  }, [finished, percent]);

  function choose(i: number) {
    if (answered) return;
    setAnswers((prev) => prev.map((a, idx) => (idx === index ? i : a)));
  }

  function next() {
    if (!isLast) {
      setIndex((n) => n + 1);
      return;
    }
    if (startRef.current !== null) setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    setFinished(true);
  }

  function restart() {
    startRef.current = null;
    setElapsed(0);
    setIndex(0);
    setAnswers(Array<number | null>(total).fill(null));
    setFinished(false);
    setRunId((n) => n + 1);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Skopíruj odkaz na kvíz:', window.location.href);
    }
  }

  /** Export do PDF = tlač stránky ("Uložiť ako PDF"). Funguje s diakritikou bez ďalších knižníc. */
  function exportPdf() {
    const previous = document.title;
    document.title = `${quiz.title} – výsledky`; // názov súboru v dialógu
    const restore = () => {
      document.title = previous;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  }

  // =================== VÝSLEDOK ===================
  if (finished) {
    const wrong = quiz.questions
      .map((q, i) => ({ q, i, chosen: answers[i] }))
      .filter(({ q, chosen }) => chosen !== q.correctOptionIndex);
    const message =
      percent === 100 ? 'Bezchybne!' : percent >= 70 ? 'Skvelá práca!' : percent >= 40 ? 'Slušný základ, ešte to precvičme.' : 'Prejdi si látku a skús to znova.';

    return (
      <>
        <div className="mx-auto max-w-2xl print:hidden">
          <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-live="polite">
            <h2 className="text-lg font-medium text-slate-500 dark:text-slate-400">Kvíz dokončený</h2>
            <p className="mt-3 text-7xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">{percent}%</p>
            <p className="mt-2 text-lg font-medium">{message}</p>

            <dl className="mt-6 flex justify-center gap-10 text-sm">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Správne</dt>
                <dd className="text-xl font-bold">
                  {score} / {total}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Čas</dt>
                <dd className="text-xl font-bold tabular-nums">{formatTime(elapsed)}</dd>
              </div>
            </dl>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <button onClick={restart} className={btnPrimary}>
                <RotateCcw className="h-4 w-4" aria-hidden /> Skúsiť znova
              </button>
              <button onClick={() => void copyLink()} className={btnSecondary}>
                {copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                {copied ? 'Odkaz skopírovaný' : 'Skopírovať odkaz'}
              </button>
              <button onClick={exportPdf} className={btnSecondary}>
                <FileDown className="h-4 w-4" aria-hidden /> Export do PDF
              </button>
            </div>
          </section>

          <section className="mt-8">
            <h3 className="mb-3 text-lg font-semibold">{wrong.length === 0 ? 'Žiadne chyby' : `Chybné odpovede (${wrong.length})`}</h3>
            {wrong.length === 0 ? (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                Všetky odpovede boli správne.
              </p>
            ) : (
              <ul className="space-y-4">
                {wrong.map(({ q, i, chosen }) => (
                  <li key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Otázka {i + 1}</p>
                    <p className="mt-1 font-semibold">{q.question}</p>
                    <p className="mt-3 flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <span>
                        <span className="font-medium">Tvoja odpoveď:</span> {chosen === null ? 'bez odpovede' : q.options[chosen]}
                      </span>
                    </p>
                    <p className="mt-1.5 flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <span>
                        <span className="font-medium">Správna odpoveď:</span> {q.options[q.correctOptionIndex]}
                      </span>
                    </p>
                    {q.explanation && (
                      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">{q.explanation}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Tlačová verzia (Export do PDF): vždy čierne na bielom, bez dark: tried */}
        <div className="hidden bg-white text-black print:block">
          <h1 className="text-2xl font-bold">{quiz.title}</h1>
          {quiz.description && <p className="mt-1 text-sm">{quiz.description}</p>}
          <p className="mt-3 text-sm">
            Výsledok: <strong>{percent} %</strong> ({score} / {total}) · Čas: {formatTime(elapsed)}
            {quiz.meta?.difficulty ? ` · Náročnosť: ${DIFFICULTY_LABELS[quiz.meta.difficulty]}` : ''}
          </p>
          <ol className="mt-6 space-y-5">
            {quiz.questions.map((q, i) => (
              <li key={q.id} className="break-inside-avoid text-sm">
                <p className="font-semibold">
                  {i + 1}. {q.question}
                </p>
                <ul className="mt-1.5 space-y-0.5 pl-4">
                  {q.options.map((o, oi) => {
                    const isCorrect = oi === q.correctOptionIndex;
                    const isChosen = oi === answers[i];
                    return (
                      <li key={oi} className={isCorrect ? 'font-semibold' : ''}>
                        {LETTERS[oi]}) {o}
                        {isCorrect ? '  ✓ správne' : ''}
                        {isChosen && !isCorrect ? '  ✗ tvoja odpoveď' : ''}
                        {isChosen && isCorrect ? '  (tvoja odpoveď)' : ''}
                      </li>
                    );
                  })}
                </ul>
                {q.explanation && <p className="mt-1.5 italic">Vysvetlenie: {q.explanation}</p>}
              </li>
            ))}
          </ol>
        </div>
      </>
    );
  }

  // =================== OTÁZKA ===================
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 print:hidden">
      <div className="mb-4 flex items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
        <span>
          Otázka {index + 1} z {total}
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium tabular-nums" role="timer" aria-label="Uplynutý čas">
          <Clock className="h-4 w-4" aria-hidden /> {formatTime(elapsed)}
        </span>
        <span>Skóre: {score}</span>
      </div>

      <div
        className="mb-6 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={index + (answered ? 1 : 0)}
      >
        <div className="h-full bg-indigo-600 transition-all" style={{ width: `${((index + (answered ? 1 : 0)) / total) * 100}%` }} />
      </div>

      <h2 className="mb-6 text-xl font-bold">{question.question}</h2>

      <div className="mb-6 space-y-3">
        {question.options.map((option, i) => (
          <button key={i} onClick={() => choose(i)} disabled={answered} className={optionClasses(i, selected, question.correctOptionIndex)}>
            <span className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-current text-xs font-semibold">
                {LETTERS[i]}
              </span>
              <span>{option}</span>
            </span>
            {answered && i === question.correctOptionIndex && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Správna odpoveď" />}
            {answered && i === selected && i !== question.correctOptionIndex && <XCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" aria-label="Nesprávna odpoveď" />}
          </button>
        ))}
      </div>

      {answered && (
        <div aria-live="polite">
          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <p className="mb-1 font-semibold">{selected === question.correctOptionIndex ? 'Správne!' : 'Nesprávne.'}</p>
            <p>{question.explanation}</p>
          </div>
          <button onClick={next} className={`${btnPrimary} w-full`}>
            {isLast ? 'Zobraziť výsledky' : 'Ďalšia otázka'} <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
