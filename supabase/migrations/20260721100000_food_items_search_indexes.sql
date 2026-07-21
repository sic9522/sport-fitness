-- Indici di ricerca su public.food_items.
-- Servono da quando il catalogo è passato da ~13.000 a ~223.000 righe con l'import
-- italiano di Open Food Facts: prima la tabella era piccola e la scansione sequenziale
-- non si notava, ora la ricerca "a mano a mano che digiti" arriva a 1,6 s sui prefissi
-- corti (misurato su 'par'), che è inaccettabile per un campo di ricerca.

-- La ricerca alimenti usa ILIKE '%testo%' (searchFoodItems in src/services/catalogs.js).
-- Il carattere jolly INIZIALE impedisce l'uso di un normale indice B-tree: serve pg_trgm,
-- che indicizza i trigrammi della stringa e sa accelerare anche i match non ancorati.
create extension if not exists pg_trgm;

create index if not exists food_items_name_trgm_idx
  on public.food_items using gin (name gin_trgm_ops);

-- Lo scanner del codice a barre cerca per uguaglianza esatta (getFoodItemByBarcode).
-- Indice parziale: la maggior parte delle righe FoodData Central ha barcode nullo e
-- non ha senso occupare spazio per quelle.
create index if not exists food_items_barcode_idx
  on public.food_items (barcode)
  where barcode is not null;

-- I risultati vengono ordinati per nome: con l'ordinamento indicizzato Postgres evita
-- di riordinare in memoria l'insieme dei candidati.
create index if not exists food_items_name_idx
  on public.food_items (name);
