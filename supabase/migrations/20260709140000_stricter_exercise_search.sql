-- Ricerca esercizi piu' stretta e intuitiva su public.catalog_exercises.
-- Sostituisce la versione basata su word_similarity (troppo permissiva) con:
--   1) match per SOTTOSTRINGA: il testo digitato deve comparire nel nome
--      (in una qualsiasi lingua) -> digitando restringe progressivamente;
--   2) tolleranza ai refusi a distanza di edit <= 1, SOLO per testi di almeno
--      4 caratteri e confrontando parola per parola.
-- Cosi' "pianca" trova "panca" (1 lettera), ma "piuanca" (2 in piu') no.
--
-- Nessuna estensione richiesta: la distanza <= 1 e' implementata in SQL puro
-- (lev_le_one), cosi' l'esecuzione non puo' fallire su create extension.
-- Da eseguire nel SQL Editor. Stessa firma: niente modifiche lato frontend.

-- Vero se a e b sono a distanza di edit (Levenshtein) <= 1.
create or replace function public.lev_le_one(a text, b text)
returns boolean
language plpgsql
immutable
as $$
declare
  s text; t text;            -- s = la piu' lunga (o uguale), t = la piu' corta
  ls int; lt int; i int; j int; diff int; skipped boolean;
begin
  if a = b then return true; end if;
  if char_length(a) >= char_length(b) then s := a; t := b; else s := b; t := a; end if;
  ls := char_length(s); lt := char_length(t);
  if ls - lt > 1 then return false; end if;

  if ls = lt then
    -- stessa lunghezza: al massimo una sostituzione
    diff := 0;
    for i in 1..ls loop
      if substr(s, i, 1) <> substr(t, i, 1) then
        diff := diff + 1;
        if diff > 1 then return false; end if;
      end if;
    end loop;
    return true;
  end if;

  -- lunghezze che differiscono di 1: togliendo un carattere da s si ottiene t?
  i := 1; j := 1; skipped := false;
  while i <= ls and j <= lt loop
    if substr(s, i, 1) = substr(t, j, 1) then
      i := i + 1; j := j + 1;
    elsif skipped then
      return false;
    else
      skipped := true;   -- salta un carattere della stringa piu' lunga
      i := i + 1;
    end if;
  end loop;
  return true;
end;
$$;

grant execute on function public.lev_le_one(text, text) to anon, authenticated;

create or replace function public.search_catalog_exercises(
  search text,
  p_locale text default 'it',
  max_results integer default 20
)
returns table (
  id uuid,
  source text,
  source_id text,
  name text,
  description text,
  category text,
  equipment text,
  primary_muscles text[],
  secondary_muscles text[],
  difficulty text,
  image_url text,
  video_url text
)
language sql
stable
set search_path = public
as $$
  with q as (select lower(coalesce(trim(search), '')) as term),
  -- Tutti i nomi (italiano base + alias) in minuscolo, per esercizio.
  name_rows as (
    select c.id, lower(c.name) as nm from public.catalog_exercises c
    union all
    select i.exercise_id, lower(i.name) from public.catalog_exercise_i18n i
  ),
  -- Parole singole di ogni nome (per il confronto fuzzy parola-per-parola).
  words as (
    select nr.id, w.word
    from name_rows nr, lateral regexp_split_to_table(nr.nm, '\s+') as w(word)
  ),
  -- Match per sottostringa e per prefisso (di parola).
  sub as (
    select nr.id,
      bool_or(nr.nm like '%' || q.term || '%') as is_sub,
      bool_or(nr.nm like q.term || '%' or nr.nm like '% ' || q.term || '%') as is_prefix
    from name_rows nr cross join q
    group by nr.id
  ),
  -- Esercizi con almeno una parola a distanza <= 1 dal testo (solo testi >= 4).
  fuzzy as (
    select distinct w.id
    from words w cross join q
    where char_length(q.term) >= 4 and public.lev_le_one(w.word, q.term)
  )
  select
    c.id, c.source, c.source_id,
    coalesce(loc.name, c.name) as name,
    c.description, c.category, c.equipment,
    c.primary_muscles, c.secondary_muscles,
    c.difficulty, c.image_url, c.video_url
  from sub s
  join public.catalog_exercises c on c.id = s.id
  left join fuzzy f on f.id = s.id
  left join public.catalog_exercise_i18n loc
    on loc.exercise_id = c.id and loc.locale = p_locale
  cross join q
  where
    q.term = ''
    or s.is_sub
    or f.id is not null
  order by
    s.is_prefix desc,                 -- prima chi inizia col testo
    s.is_sub desc,                    -- poi chi lo contiene
    (f.id is not null) desc,          -- poi i match per refuso
    coalesce(loc.name, c.name) asc
  limit greatest(1, coalesce(max_results, 20));
$$;

grant execute on function public.search_catalog_exercises(text, text, integer) to anon, authenticated;
