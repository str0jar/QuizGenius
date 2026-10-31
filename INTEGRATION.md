# QuizGenius v2 – návod na integráciu

Balík obsahuje iba **nové a zmenené súbory**. Skopíruj ich do koreňa projektu (rovnaká štruktúra priečinkov) a prepíš existujúce.

## 1. Nainštaluj balíčky

```bash
npm i @supabase/ssr next-themes canvas-confetti
npm i -D @types/canvas-confetti
```

## 2. Skopíruj súbory

| Súbor | Stav |
|---|---|
| `proxy.ts` | nový (v Next.js 16 nahrádza `middleware.ts`) |
| `lib/quiz.ts`, `lib/auth.ts`, `lib/safe-next.ts`, `lib/supabase-server.ts`, `lib/supabase-browser.ts` | nové |
| `components/Header.tsx`, `UserMenu.tsx`, `ThemeToggle.tsx`, `Providers.tsx`, `AuthForm.tsx` | nové |
| `app/login/page.tsx`, `app/register/page.tsx` | nové |
| `app/auth/callback/route.ts`, `app/auth/signout/route.ts` | nové |
| `app/profile/page.tsx`, `QuizHistory.tsx`, `actions.ts` | nové |
| `app/layout.tsx`, `app/globals.css`, `app/page.tsx` | zmenené |
| `app/dashboard/page.tsx`, `app/dashboard/GenerateForm.tsx` | zmenené |
| `app/api/generate/route.ts` | zmenený |
| `app/q/[slug]/page.tsx`, `app/q/[slug]/QuizPlayer.tsx` | zmenené |
| `supabase/migration.sql` | nový (spúšťa sa v Supabase) |

`lib/supabase.ts` ostáva bezo zmeny (používa ho verejný player). `lib/openai.ts` nie je nikde použitý, môžeš ho zmazať.

## 3. Databáza

V Supabase → **SQL Editor** spusti celý `supabase/migration.sql`. Je idempotentný, takže ho môžeš pustiť aj opakovane. Skript:

- vytvorí `profiles` a trigger, ktorý profil založí po každej registrácii (e-mail aj Google),
- doplní profily existujúcim používateľom,
- pridá `quizzes.user_id` a index,
- nastaví RLS: čítať môže každý (verejný odkaz), vkladať a mazať iba vlastník.

Staré kvízy bez `user_id` ostanú dostupné cez odkaz, ale v profile sa nezobrazia. Ak chceš niektoré priradiť sebe, v skripte je na konci príkaz `update`.

## 4. Supabase Auth

1. **Authentication → Providers → Email**: zapni. Ak je zapnuté „Confirm email“, po registrácii príde potvrdzovací e-mail (formulár to zobrazí). Na lokálne testovanie ho môžeš vypnúť.
2. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback` (a neskôr produkčná doména s `/auth/callback`)
3. **Google OAuth**:
   - Google Cloud Console → APIs & Services → Credentials → *Create OAuth client ID* (Web application).
   - Authorized redirect URI: `https://<tvoj-projekt>.supabase.co/auth/v1/callback`
   - Client ID a Client Secret vlož v Supabase → Authentication → Providers → **Google** a zapni ho.

## 5. Premenné prostredia

`.env.local` zostáva rovnaký (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`). Voliteľne môžeš pridať `GEMINI_MODEL`, ak chceš zmeniť model bez zásahu do kódu.

## 6. Test

1. `npm run dev` → `/register` → vytvor účet (alebo „Pokračovať cez Google“).
2. `/dashboard` → vlož text (min. 50 znakov), zvoľ počet otázok a náročnosť → „Vygenerovať kvíz“.
3. Na `/q/<slug>` odohraj kvíz: beží stopky, na konci sa zobrazí skóre, konfety (od 70 %), chybné otázky, „Skopírovať odkaz“ a „Export do PDF“.
4. `/profile` → štatistiky, vyhľadávanie (funguje aj bez diakritiky), Otvoriť / Skopírovať odkaz / Zmazať.
5. Otvor odkaz kvízu v anonymnom okne – musí fungovať bez prihlásenia.
6. Tmavý režim prepneš ikonou slnka/mesiaca v hlavičke.

## 7. Dôležité poznámky

**Tvoj projekt používa Next.js 16 s `cacheComponents: true`.** Podľa dokumentácie v `node_modules/next/dist/docs` preto:
- sa `middleware.ts` volá `proxy.ts` a exportuje funkciu `proxy`,
- každý komponent, ktorý číta cookies, `params` alebo `searchParams`, musí byť v `<Suspense>`. Kód to rešpektuje (Header, dashboard, profil, login, register, player).

**Oprava existujúcej chyby:** pôvodný `QuizPlayer` čítal `correctOptionIndex`, ale API ukladalo `correctAnswer`, takže sa skóre nikdy nezapočítalo. Teraz API ukladá `correctOptionIndex` a `normalizeQuiz()` v `lib/quiz.ts` prekladá aj staré kvízy uložené s `correctAnswer`.

**Generovanie vyžaduje prihlásenie.** Bez neho by sa nedalo uložiť `user_id`. Neprihlásený používateľ je presmerovaný na `/login`.

**Chyba 503 od Gemini:** server skúsi požiadavku ešte 2× (po 1,5 s a 3,5 s). Ak model stále neodpovedá, vráti `503` s kódom `AI_OVERLOADED`. Formulár zobrazí žltú hlášku, zachová text a ponúkne tlačidlo „Skúsiť znova“ s odpočtom. Podobne sa ošetruje limit `429`.

**Export do PDF** používa tlač prehliadača („Uložiť ako PDF“) s vyhradenou tlačovou verziou kvízu. Dôvod: štandardné písma knižnice jsPDF nepodporujú slovenskú diakritiku (ľ, č, ť, ň…) bez vkladania vlastného fontu.

**Verejné čítanie kvízov:** politika `select using (true)` znamená, že kvíz si môže prečítať ktokoľvek, kto pozná slug, a technicky aj vylistovať všetky cez anon kľúč. Pre verejný player to tak bolo navrhnuté. Ak chceš mať aj súkromné kvízy, treba pridať stĺpec `is_public` a upraviť politiku.
