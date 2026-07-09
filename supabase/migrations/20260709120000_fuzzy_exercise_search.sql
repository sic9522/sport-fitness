-- Ricerca esercizi con tolleranza ai refusi su public.catalog_exercises.
-- Aggiunge pg_trgm, un indice trigram e la funzione RPC search_catalog_exercises,
-- che combina match per sottostringa (ilike) e similarita' trigram (word_similarity),
-- cosi' "pianca" trova "Panca Piana con Bilanciere".
--
-- Da eseguire nel SQL Editor DOPO le migrazioni 162000 / 170000 e il seed.

create extension if not exists pg_trgm;

-- Indice trigram su lower(name): usato sia da ilike '%...%' sia da word_similarity (<%).
create index if not exists catalog_exercises_name_trgm_idx
  on public.catalog_exercises using gin (lower(name) gin_trgm_ops);

-- Ricerca fuzzy. Ritorna la riga intera del catalogo, ordinata per rilevanza:
-- 1) chi inizia col testo digitato, 2) maggiore similarita' trigram, 3) nome A-Z.
-- search vuoto -> tutto l'elenco in ordine alfabetico (con il limite).
create or replace function public.search_catalog_exercises(
  search text,
  max_results integer default 20
)
returns setof public.catalog_exercises
language sql
stable
set search_path = public, extensions
as $$
  with q as (select lower(coalesce(trim(search), '')) as term)
  select c.*
  from public.catalog_exercises c, q
  where
    q.term = ''
    or lower(c.name) like '%' || q.term || '%'
    or word_similarity(q.term, lower(c.name)) > 0.3
  order by
    (q.term <> '' and lower(c.name) like q.term || '%') desc,
    word_similarity(q.term, lower(c.name)) desc,
    c.name asc
  limit greatest(1, coalesce(max_results, 20));
$$;

grant execute on function public.search_catalog_exercises(text, integer) to anon, authenticated;
