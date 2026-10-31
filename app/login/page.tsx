import { Suspense } from 'react';
import AuthForm from '@/components/AuthForm';
import { safeNext } from '@/lib/safe-next';

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export const metadata = { title: 'Prihlásenie · QuizGenius' };

// searchParams sú údaje z requestu → čítame ich vnútri <Suspense> (Cache Components)
export default function LoginPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 w-full max-w-sm animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({ searchParams }: Props) {
  const { next, error } = await searchParams;
  return (
    <AuthForm
      mode="login"
      next={safeNext(next)}
      initialError={error === 'auth' ? 'Prihlásenie sa nepodarilo. Skús to prosím znova.' : undefined}
    />
  );
}
