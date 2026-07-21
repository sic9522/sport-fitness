-- Registro degli allenamenti EFFETTIVAMENTE SVOLTI, per utente.
-- Rispecchia la chiave localStorage 'fitpulse-workout-log' gestita da
-- src/data/workoutLog.js e alimentata dal pulsante avvia/termina della scheda
-- (src/components/SchedaView.jsx).
--
-- Da non confondere con public.workout_cards, che è il PIANO settimanale: qui finisce
-- solo ciò che è stato davvero completato. È la fonte dell'activity trend e della stima
-- delle calorie bruciate in Statistiche.

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Giorno in cui l'allenamento è stato svolto (fuso locale del dispositivo, come la
  -- chiave-giorno usata in locale: l'app ragiona per giornate, non per istanti).
  day date not null,
  -- Nome della scheda al momento dello svolgimento, copiato: se la scheda viene poi
  -- rinominata o cancellata, lo storico resta leggibile.
  nome text,
  -- La scheda di origine, se esiste ancora. Volutamente ON DELETE SET NULL: cancellare
  -- una scheda non deve cancellare la storia degli allenamenti fatti.
  workout_card_id uuid references public.workout_cards(id) on delete set null,
  duration_min integer not null default 0 check (duration_min >= 0),
  exercises integer not null default 0 check (exercises >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger workout_sessions_set_updated_at
before update on public.workout_sessions
for each row execute function public.set_updated_at();

alter table public.workout_sessions enable row level security;

create policy "Users can manage their own workout sessions"
on public.workout_sessions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Le letture sono "le sessioni di questo utente negli ultimi N giorni" (activity trend).
create index workout_sessions_user_day_idx on public.workout_sessions (user_id, day desc);
