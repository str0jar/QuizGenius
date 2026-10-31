import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase klient viazaný na session prihláseného používateľa (cookies).
 * Rešpektuje RLS. Použitie: Server Components, Route Handlers, Server Actions.
 * Číta cookies() => musí sa volať vnútri <Suspense> (Cache Components).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Volané zo Server Componentu, kde sa cookies nedajú zapisovať – session obnovuje proxy.ts.
        }
      },
    },
  });
}
