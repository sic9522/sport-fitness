-- Pagina Prodotti: regione di mercato sul catalogo unificato public.food_items.
-- I prodotti arrivano dall'import in blocco di Open Food Facts e FoodData Central
-- (scripts/import-foods.mjs). Solo dati nutrizionali: niente immagini.

-- Regione/i di mercato per la select EU/US/CN della pagina Prodotti. Un prodotto può
-- essere venduto in più mercati → array. Valori: 'eu' | 'us' | 'cn'
-- (derivati dai countries_tags di Open Food Facts; FoodData Central → 'us').
alter table public.food_items
  add column if not exists regions text[] not null default '{}';

-- Filtro per regione della pagina Prodotti (array contains/overlaps).
create index if not exists food_items_regions_idx on public.food_items using gin (regions);
