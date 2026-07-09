-- Nomi multilingua degli esercizi del catalogo (public.catalog_exercises).
-- La colonna base catalog_exercises.name resta l'italiano; qui stanno le altre
-- lingue (en/es/fr/zh). La ricerca diventa multilingua: matcha su TUTTE le
-- lingue e restituisce il nome nella lingua richiesta (fallback: italiano base).
--
-- Da eseguire nel SQL Editor DOPO seed.sql, poi caricare supabase/seed_i18n.sql.

create extension if not exists pg_trgm;

create table if not exists public.catalog_exercise_i18n (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.catalog_exercises(id) on delete cascade,
  locale text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exercise_id, locale)
);

create index if not exists catalog_exercise_i18n_exercise_idx
  on public.catalog_exercise_i18n (exercise_id);
create index if not exists catalog_exercise_i18n_name_trgm_idx
  on public.catalog_exercise_i18n using gin (lower(name) gin_trgm_ops);

create trigger catalog_exercise_i18n_set_updated_at
before update on public.catalog_exercise_i18n
for each row execute function public.set_updated_at();

alter table public.catalog_exercise_i18n enable row level security;

create policy "Exercise translations are readable"
on public.catalog_exercise_i18n for select
to anon, authenticated
using (true);

-- Sostituisce la versione a 2 argomenti con una locale-aware.
drop function if exists public.search_catalog_exercises(text, integer);

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
set search_path = public, extensions
as $$
  with q as (select lower(coalesce(trim(search), '')) as term),
  -- Per ogni esercizio: miglior punteggio su italiano base + tutti gli alias.
  scored as (
    select c.id,
      max(greatest(
        case when lower(n.nm) like '%' || q.term || '%' then 1.0 else 0 end,
        word_similarity(q.term, lower(n.nm))
      )) as score,
      bool_or(lower(n.nm) like q.term || '%') as is_prefix
    from public.catalog_exercises c
    cross join q
    join lateral (
      select c.name as nm
      union all
      select i.name from public.catalog_exercise_i18n i where i.exercise_id = c.id
    ) n on true
    group by c.id
  )
  select
    c.id, c.source, c.source_id,
    coalesce(loc.name, c.name) as name,
    c.description, c.category, c.equipment,
    c.primary_muscles, c.secondary_muscles,
    c.difficulty, c.image_url, c.video_url
  from scored s
  join public.catalog_exercises c on c.id = s.id
  left join public.catalog_exercise_i18n loc
    on loc.exercise_id = c.id and loc.locale = p_locale
  cross join q
  where q.term = '' or s.score > 0.3
  order by s.is_prefix desc, s.score desc, coalesce(loc.name, c.name) asc
  limit greatest(1, coalesce(max_results, 20));
$$;

grant execute on function public.search_catalog_exercises(text, text, integer) to anon, authenticated;
