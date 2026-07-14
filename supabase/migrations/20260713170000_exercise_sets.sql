-- Serie con valori per-serie ("split") sugli esercizi utente.
-- Il frontend (data/exerciseSets.js) tiene `sets` (conteggio) + `reps`/`weight_kg`
-- come valori canonici (prima serie / condivisi); con split ON ogni serie ha la sua
-- coppia reps/kg in `set_details` (array jsonb [{reps, kg}]). Retro-compatibile:
-- gli esercizi esistenti restano is_split=false.

alter table public.exercises
  add column if not exists is_split boolean not null default false,
  add column if not exists set_details jsonb;