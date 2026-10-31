import Link from 'next/link';
import { Sparkles, Brain, Share2, Zap } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Bleskové generovanie',
    text: 'Vlož text a do niekoľkých sekúnd máš pripravený kompletne naformátovaný kvíz.',
  },
  {
    icon: Brain,
    title: 'Múdre vysvetlenia',
    text: 'Každá otázka obsahuje aj detailné vysvetlenie, prečo je daná odpoveď správna.',
  },
  {
    icon: Share2,
    title: 'Jednoduché zdieľanie',
    text: 'Vygenerovaný kvíz má vlastný unikátny odkaz, ktorý môžeš ihneď poslať spolužiakom.',
  },
];

// Navigáciu už rieši globálny <Header /> v app/layout.tsx
export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-20 text-center">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
        <Sparkles className="h-4 w-4" aria-hidden />
        <span>Generovanie kvízov pomocou AI</span>
      </div>

      <h1 className="mb-6 text-4xl font-extrabold tracking-tight md:text-6xl">
        Premeň akýkoľvek text na <br />
        <span className="text-indigo-600 dark:text-indigo-400">interaktívny študijný kvíz</span>
      </h1>

      <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-600 dark:text-slate-400 md:text-xl">
        Vlož študijné poznámky, článok alebo dokument a nechaj umelú inteligenciu vygenerovať otázky so správnymi odpoveďami a vysvetleniami za pár sekúnd.
      </p>

      <div className="flex justify-center gap-4">
        <Link
          href="/dashboard"
          className="rounded-xl bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-indigo-700 hover:shadow-indigo-200 dark:shadow-none"
        >
          Vyskúšať zadarmo
        </Link>
      </div>

      <div className="mt-24 grid gap-8 text-left md:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
              <Icon className="h-6 w-6" aria-hidden />
            </div>
            <h3 className="mb-2 text-xl font-bold">{title}</h3>
            <p className="text-slate-600 dark:text-slate-400">{text}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
