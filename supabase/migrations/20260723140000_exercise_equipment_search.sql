-- Ricerca esercizi PER ATTREZZO.
--
-- Problema che risolve: `catalog_exercises.equipment` contiene slug inglesi
-- ('dumbbell', 'barbell', 'cable'…) mentre `search_catalog_exercises` cercava solo
-- nei NOMI. Risultato: cercando "manubri" uscivano i soli esercizi che hanno la
-- parola nel nome, e "Curl a Martello" — che i manubri li usa eccome — restava
-- fuori. Cercando "bilanciere" idem.
--
-- Qui si introduce il vocabolario degli attrezzi (slug -> nome italiano +
-- sinonimi) e la ricerca lo consulta: l'attrezzo diventa una chiave di ricerca a
-- pieno titolo, senza doverlo ripetere nel nome di ogni esercizio.

create table if not exists public.catalog_equipment (
  slug text primary key,
  -- Nome mostrabile in italiano ("Manubri"): serve anche alla UI, non solo alla ricerca.
  label_it text not null,
  -- Parole con cui l'utente puo' cercare l'attrezzo: sinonimi, plurale/singolare,
  -- gergo di palestra e termine inglese (per chi usa l'app in inglese).
  -- Vanno in minuscolo e separate da spazi: la ricerca le confronta parola per parola.
  search_terms text not null default '',
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

alter table public.catalog_equipment enable row level security;

drop policy if exists "Equipment is readable" on public.catalog_equipment;
create policy "Equipment is readable" on public.catalog_equipment for select using (true);

-- Vocabolario. NB: i refusi frequenti NON si elencano qui — ci pensa il confronto
-- a distanza di edit <= 1 della ricerca ("bilancere" trova "bilanciere").
insert into public.catalog_equipment (slug, label_it, search_terms, sort_order) values
  ('barbell',    'Bilanciere',      'bilanciere bilancieri bilancere barbell bar',                     10),
  ('ez-bar',     'Bilanciere EZ',   'bilanciere ez curvo sagomato ezbar barbell',                      20),
  ('dumbbell',   'Manubri',         'manubri manubrio dumbbell dumbbells pesi',                        30),
  ('kettlebell', 'Kettlebell',      'kettlebell kettlebells ghiria campana',                           40),
  ('cable',      'Cavi',            'cavi cavo pulley cable macchina a cavi',                          50),
  ('machine',    'Macchina',        'macchina macchinario machine attrezzo isotonica',                 60),
  ('smith',      'Multipower',      'multipower smith machine castello guidato',                       70),
  ('band',       'Elastico',        'elastico elastici banda band resistenza',                         80),
  ('bodyweight', 'Corpo libero',    'corpo libero bodyweight senza attrezzi nessun attrezzo a corpo libero', 90),
  ('trx',        'TRX',             'trx anelli sospensione suspension',                              100)
on conflict (slug) do update set
  label_it = excluded.label_it,
  search_terms = excluded.search_terms,
  sort_order = excluded.sort_order;

-- Ricerca esercizi. Rispetto alla versione precedente cambia UNA cosa: si cerca
-- anche nell'attrezzo, e i match per attrezzo stanno DOPO quelli per nome.
--
-- Ordine dei risultati:
--   1. il nome INIZIA col testo          "manubri" -> "Manubri..." se esistesse
--   2. il nome CONTIENE il testo         -> "Spinte con Manubri", "Curl con Manubri"
--   3. l'ATTREZZO corrisponde            -> "Curl a Martello" (manubri, non nel nome)
--   4. refuso nel nome (distanza <= 1)   -> "pianca" trova "panca"
-- A parita' di tutto, ordine alfabetico.
--
-- La tolleranza ai refusi vale ora anche per l'attrezzo, cosi' "bilancere" trova
-- tutto quello che si fa col bilanciere e non solo chi lo scrive nel nome.
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
  ),
  -- Attrezzi il cui nome o sinonimi corrispondono al testo: per sottostringa
  -- (cosi' "manub" restringe mentre si digita) oppure per refuso su una parola.
  equip as (
    select e.slug
    from public.catalog_equipment e
    cross join q
    where q.term <> '' and (
      lower(e.label_it) like '%' || q.term || '%'
      or e.search_terms like '%' || q.term || '%'
      or exists (
        select 1
        from regexp_split_to_table(e.search_terms || ' ' || lower(e.label_it), '\s+') as w(word)
        where char_length(q.term) >= 4 and public.lev_le_one(w.word, q.term)
      )
    )
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
  left join equip eq on eq.slug = c.equipment
  left join public.catalog_exercise_i18n loc
    on loc.exercise_id = c.id and loc.locale = p_locale
  cross join q
  where
    q.term = ''
    or s.is_sub
    or eq.slug is not null
    or f.id is not null
  order by
    s.is_prefix desc,                 -- 1. prima chi inizia col testo
    s.is_sub desc,                    -- 2. poi chi lo contiene nel nome
    (eq.slug is not null) desc,       -- 3. poi chi usa quell'attrezzo
    (f.id is not null) desc,          -- 4. infine i match per refuso
    coalesce(loc.name, c.name) asc
  limit greatest(1, coalesce(max_results, 20));
$$;

grant execute on function public.search_catalog_exercises(text, text, integer) to anon, authenticated;
