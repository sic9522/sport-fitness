-- Alimenti GENERICI + ricerca alimenti con ranking.
--
-- Problema che risolve: il catalogo `public.food_items` contiene solo prodotti
-- CONFEZIONATI (Open Food Facts + FoodData Central Branded). Digitando "bistecca"
-- l'utente riceveva "Bistecca bianca di Marsure" (un formaggio), "Bistecca di
-- formaggio alla rucola" e due volte "Bistecca Di Lombo Di Suino" — perche':
--   1) gli alimenti generici ("bistecca di manzo") non sono prodotti da scaffale
--      e quindi NON esistono in quelle fonti;
--   2) la ricerca era `ilike '%testo%'` ordinata per NOME: nessuna rilevanza,
--      quindi vince chi viene prima in alfabeto;
--   3) lo stesso prodotto compare piu' volte (stesso nome e marca, fonti diverse
--      o righe duplicate a monte) e occupa i pochi posti del menu a tendina.
--
-- Qui si introduce: `source = 'generic'` per gli alimenti curati da noi (valori
-- medi, nessuna marca), una colonna di sinonimi per farli trovare anche con altre
-- parole, e una RPC che ordina per rilevanza mettendo i generici davanti.

-- Sinonimi/parole alternative dell'alimento ("manzo bovino carne rossa"), cercati
-- insieme al nome. Usata soprattutto dai generici; nulla sui prodotti importati.
alter table public.food_items
  add column if not exists search_terms text;

create index if not exists food_items_search_terms_trgm_idx
  on public.food_items using gin (search_terms gin_trgm_ops);

-- I generici sono poche centinaia su centinaia di migliaia di righe: indice
-- parziale, cosi' la RPC li raccoglie tutti senza scansionare la tabella.
create index if not exists food_items_generic_idx
  on public.food_items (name)
  where source = 'generic';

-- Il btree sul nome NON c'era, malgrado la migrazione 20260721100000 lo chiedesse:
-- la creava come `food_items_name_idx`, nome gia' occupato dall'indice GIN
-- to_tsvector(name) creato in 20260708170000, quindi `if not exists` l'ha saltata
-- in SILENZIO. Senza btree ogni "Carica altri" della pagina Prodotti (order by
-- name) riordina da capo 223.000 righe. Qui con un nome libero.
create index if not exists food_items_name_btree_idx
  on public.food_items (name);

-- Ricerca alimenti per il campo "Nome" delle modali e per la pagina Prodotti.
--
-- Ordine dei risultati (il `rank`):
--   0 generico con nome esatto        -> "bistecca" trova "Bistecca"
--   1 generico che inizia col testo   -> "Bistecca di manzo", "di pollo"...
--   2 generico che lo contiene        -> "Tagliata di manzo" cercando "manzo"
--   3 confezionato con nome esatto
--   4 confezionato che inizia col testo
--   5 confezionato che lo contiene
-- A parita' di rank vince il nome piu' corto: e' quasi sempre il piu' generale.
--
-- I candidati sono limitati PRIMA di ordinare: su un prefisso comune ("pa") i
-- confezionati che matchano sono decine di migliaia e ordinarli tutti costerebbe
-- secondi. I generici invece si prendono sempre tutti (sono pochi), cosi' non
-- possono essere esclusi dal taglio.
create or replace function public.search_food_items(
  search text,
  max_results integer default 20
)
returns table (
  id uuid,
  source text,
  source_id text,
  name text,
  brand text,
  barcode text,
  serving_size numeric,
  serving_unit text,
  calories_kcal numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  fiber_g numeric,
  sugar_g numeric,
  salt_g numeric,
  regions text[]
)
language sql
stable
set search_path = public
as $$
  with q as (
    select lower(btrim(coalesce(search, ''))) as term
  ),
  pat as (
    select term, '%' || term || '%' as like_pat
    from q
    where char_length(term) >= 2
  ),
  candidates as (
    (
      select f.*
      from public.food_items f, pat
      where f.source = 'generic'
        and (lower(f.name) like pat.like_pat or lower(f.search_terms) like pat.like_pat)
      limit 40
    )
    union all
    (
      select f.*
      from public.food_items f, pat
      where f.source <> 'generic'
        and lower(f.name) like pat.like_pat
      limit 300
    )
  ),
  ranked as (
    select
      c.*,
      case
        when c.source = 'generic' and lower(c.name) = q.term then 0
        when c.source = 'generic' and lower(c.name) like q.term || '%' then 1
        when c.source = 'generic' then 2
        when lower(c.name) = q.term then 3
        when lower(c.name) like q.term || '%' then 4
        else 5
      end as rank
    from candidates c cross join q
  ),
  -- Stesso nome e stessa marca = stesso alimento: se ne tiene uno solo, quello
  -- meglio piazzato. Senza questo i doppioni riempiono la tendina.
  deduped as (
    select distinct on (lower(name), coalesce(lower(brand), ''))
      id, source, source_id, name, brand, barcode, serving_size, serving_unit,
      calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, salt_g, regions, rank
    from ranked
    order by lower(name), coalesce(lower(brand), ''), rank, id
  )
  select
    id, source, source_id, name, brand, barcode, serving_size, serving_unit,
    calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, salt_g, regions
  from deduped
  order by rank, char_length(name), lower(name)
  limit greatest(1, coalesce(max_results, 20));
$$;

grant execute on function public.search_food_items(text, integer) to anon, authenticated;
