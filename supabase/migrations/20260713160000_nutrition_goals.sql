-- Obiettivi nutrizionali giornalieri per-utente.
-- Rispecchia la chiave localStorage 'fitpulse-nutrition-goals' (kcal + macro).
-- Una riga per utente (PK = user_id). Usata dal frontend via services/nutrition
-- (fetchGoals / upsertGoals) e sincronizzata da hooks/useNutritionSync.

create table public.nutrition_goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  kcal numeric not null default 2000,
  protein_g numeric not null default 150,
  carbs_g numeric not null default 220,
  fat_g numeric not null default 60,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger nutrition_goals_set_updated_at
before update on public.nutrition_goals
for each row execute function public.set_updated_at();

alter table public.nutrition_goals enable row level security;

create policy "Users can manage their own nutrition goals"
on public.nutrition_goals
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
