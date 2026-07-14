-- Macro estesi sugli OBIETTIVI nutrizionali: zuccheri e fibre.
-- Il diario (meal_entries) usa colonne già esistenti: fat_g (grassi totali),
-- sugar_g (zuccheri), fiber_g (fibre) → nessuna ALTER necessaria lì.
-- I grassi restano un valore unico (fat_g), senza distinzione saturi/insaturi.

alter table public.nutrition_goals
  add column if not exists sugars_g numeric not null default 50,
  add column if not exists fiber_g numeric not null default 30;
