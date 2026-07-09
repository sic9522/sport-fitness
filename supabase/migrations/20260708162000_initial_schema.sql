-- FitPulse initial database schema for Supabase/Postgres.
-- Apply this migration after creating the Supabase project.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'it',
  theme_id text not null default 'default',
  accent_color text,
  on_accent_color text,
  navbar_color text,
  body_bg_color text,
  rest_duration_seconds integer not null default 30 check (rest_duration_seconds >= 0),
  timer_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null check (period in ('daily', 'weekly', 'monthly')),
  title text not null,
  title_key text,
  emoji text,
  current_value numeric not null default 0,
  target_value numeric not null default 0,
  unit text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ring_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ring_key text not null,
  label text not null,
  label_key text,
  color text not null,
  current_value numeric not null default 0,
  target_value numeric not null default 0,
  unit text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, ring_key)
);

create table public.workout_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  day_key text check (day_key in ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')),
  is_custom boolean not null default false,
  status text not null default 'none' check (status in ('none', 'done', 'skip')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (day_key is not null or name is not null)
);

create unique index workout_days_user_day_key_unique
  on public.workout_days (user_id, day_key)
  where day_key is not null;

create table public.workout_cards (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null references public.workout_days(id) on delete cascade,
  name text not null default '',
  is_custom boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  workout_card_id uuid not null references public.workout_cards(id) on delete cascade,
  title text not null,
  sets text not null default '3',
  reps text not null default '8',
  weight_kg text not null default '20',
  photo_url text,
  status text not null default 'none' check (status in ('none', 'done', 'skip')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_goals_user_period_idx on public.user_goals (user_id, period, sort_order);
create index ring_settings_user_idx on public.ring_settings (user_id, sort_order);
create index workout_days_user_idx on public.workout_days (user_id, sort_order);
create index workout_cards_day_idx on public.workout_cards (workout_day_id, sort_order);
create index exercises_card_idx on public.exercises (workout_card_id, sort_order);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

create trigger user_goals_set_updated_at
before update on public.user_goals
for each row execute function public.set_updated_at();

create trigger ring_settings_set_updated_at
before update on public.ring_settings
for each row execute function public.set_updated_at();

create trigger workout_days_set_updated_at
before update on public.workout_days
for each row execute function public.set_updated_at();

create trigger workout_cards_set_updated_at
before update on public.workout_cards
for each row execute function public.set_updated_at();

create trigger exercises_set_updated_at
before update on public.exercises
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_goals enable row level security;
alter table public.ring_settings enable row level security;
alter table public.workout_days enable row level security;
alter table public.workout_cards enable row level security;
alter table public.exercises enable row level security;

create policy "Users can manage their own profile"
on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can manage their own settings"
on public.user_settings
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their own goals"
on public.user_goals
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their own rings"
on public.ring_settings
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their own workout days"
on public.workout_days
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage cards from their own days"
on public.workout_cards
for all
using (
  exists (
    select 1
    from public.workout_days d
    where d.id = workout_cards.workout_day_id
      and d.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.workout_days d
    where d.id = workout_cards.workout_day_id
      and d.user_id = auth.uid()
  )
);

create policy "Users can manage exercises from their own cards"
on public.exercises
for all
using (
  exists (
    select 1
    from public.workout_cards c
    join public.workout_days d on d.id = c.workout_day_id
    where c.id = exercises.workout_card_id
      and d.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.workout_cards c
    join public.workout_days d on d.id = c.workout_day_id
    where c.id = exercises.workout_card_id
      and d.user_id = auth.uid()
  )
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );

  insert into public.user_settings (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
