-- Idratazione per-utente: totale bevuto per giorno + obiettivo giornaliero.
-- Rispecchia le chiavi localStorage 'fitpulse-hydration' ({ 'YYYY-MM-DD': ml }) e
-- 'fitpulse-hydration-goal', gestite da src/data/hydrationDefaults.js e mostrate in
-- Statistiche (src/pages/Insights.jsx).
--
-- Si salva il TOTALE del giorno, non le singole bevute: è il dato che serve all'app
-- (barra di progresso e anello della Home) e tiene il record minimo anche dopo anni.

create table public.hydration_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  ml integer not null default 0 check (ml >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create trigger hydration_days_set_updated_at
before update on public.hydration_days
for each row execute function public.set_updated_at();

alter table public.hydration_days enable row level security;

create policy "Users can manage their own hydration"
on public.hydration_days
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Le letture sono quasi sempre "gli ultimi N giorni di questo utente".
create index hydration_days_user_day_idx on public.hydration_days (user_id, day desc);

-- Obiettivo giornaliero in ml. Riga singola per utente, come nutrition_goals.
create table public.hydration_goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goal_ml integer not null default 2000 check (goal_ml > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger hydration_goals_set_updated_at
before update on public.hydration_goals
for each row execute function public.set_updated_at();

alter table public.hydration_goals enable row level security;

create policy "Users can manage their own hydration goal"
on public.hydration_goals
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
