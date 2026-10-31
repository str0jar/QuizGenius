-- =====================================================================
-- QuizGenius – migrácia pre účty, profil a mazanie kvízov
-- Spusti v Supabase → SQL Editor. Skript je idempotentný (dá sa pustiť opakovane).
-- =====================================================================

-- 1) Profily (ak ešte neexistujú) -------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  is_pro boolean default false,
  stripe_customer_id text,
  quizzes_created_this_month integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

drop policy if exists "Používateľ číta vlastný profil" on public.profiles;
create policy "Používateľ číta vlastný profil"
  on public.profiles for select using (auth.uid() = id);

-- 2) Automatické vytvorenie profilu po registrácii (e-mail aj Google) --
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Profily pre už existujúcich používateľov
insert into public.profiles (id, email)
select id, coalesce(email, '') from auth.users
on conflict (id) do nothing;

-- 3) Stĺpec user_id v quizzes ------------------------------------------
alter table public.quizzes
  add column if not exists user_id uuid references public.profiles(id) on delete cascade;

create index if not exists quizzes_user_created_idx on public.quizzes (user_id, created_at desc);

-- 4) RLS politiky pre quizzes -------------------------------------------
alter table public.quizzes enable row level security;

-- Čítanie: ktokoľvek s odkazom (verejný player /q/[slug] funguje bez prihlásenia)
drop policy if exists "Každý môže čítať kvíz cez slug" on public.quizzes;
create policy "Každý môže čítať kvíz cez slug"
  on public.quizzes for select using (true);

-- Vytváranie: iba prihlásený používateľ, iba pod svojím user_id
drop policy if exists "Používateľ vytvára vlastné kvízy" on public.quizzes;
create policy "Používateľ vytvára vlastné kvízy"
  on public.quizzes for insert with check (auth.uid() = user_id);

-- Mazanie: iba vlastník
drop policy if exists "Používateľ maže vlastné kvízy" on public.quizzes;
create policy "Používateľ maže vlastné kvízy"
  on public.quizzes for delete using (auth.uid() = user_id);

-- (voliteľné) Úprava iba vlastníkom
drop policy if exists "Používateľ upravuje vlastné kvízy" on public.quizzes;
create policy "Používateľ upravuje vlastné kvízy"
  on public.quizzes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5) Staré kvízy bez majiteľa ---------------------------------------------
-- Kvízy vytvorené pred zavedením účtov majú user_id = NULL. Ostanú dostupné cez odkaz,
-- ale v profile sa nezobrazia. Ak chceš niektoré priradiť sebe, po registrácii spusti:
--   update public.quizzes set user_id = '<tvoje-uuid-z-auth.users>' where user_id is null;
