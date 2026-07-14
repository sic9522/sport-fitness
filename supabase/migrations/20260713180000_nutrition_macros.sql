-- Macro-nutrienti estesi: grassi saturi/insaturi sugli alimenti del diario e
-- obiettivi per i nuovi macro. Zuccheri e fibre usano le colonne già esistenti
-- di meal_entries (sugar_g, fiber_g). Retro-compatibile (colonne nullable / con default).

-- Diario: grassi saturi/insaturi per alimento.
alter table public.meal_entries
  add column if not exists sat_fat_g numeric,
  add column if not exists unsat_fat_g numeric;

-- Obiettivi: nuovi macro (kcal/protein_g/carbs_g già presenti; fat_g resta legacy).
alter table public.nutrition_goals
  add column if not exists sat_fat_g numeric not null default 20,
  add column if not exists unsat_fat_g numeric not null default 40,
  add column if not exists sugars_g numeric not null default 50,
  add column if not exists fiber_g numeric not null default 30;
