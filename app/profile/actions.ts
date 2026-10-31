'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function deleteQuiz(id: string): Promise<{ ok: boolean; error?: string }> {
  // Server Action je verejný endpoint → session aj vlastníctvo overujeme znova tu.
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Musíš sa prihlásiť.' };
  if (typeof id !== 'string' || id.length === 0) return { ok: false, error: 'Neplatný kvíz.' };

  const supabase = await createSupabaseServerClient();
  const { error, count } = await supabase.from('quizzes').delete({ count: 'exact' }).eq('id', id).eq('user_id', user.id);

  if (error) {
    console.error('[deleteQuiz]', error);
    return { ok: false, error: 'Kvíz sa nepodarilo zmazať.' };
  }
  if (!count) {
    console.error('[deleteQuiz] 0 zmazaných riadkov – chýba DELETE politika v RLS? (spusti supabase/migration.sql)');
    return { ok: false, error: 'Kvíz sa nepodarilo zmazať.' };
  }

  revalidatePath('/profile');
  revalidatePath('/dashboard');
  return { ok: true };
}
