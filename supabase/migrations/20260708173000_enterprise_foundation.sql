-- Enterprise foundation schema.
-- This migration introduces normalized domain schemas without breaking the
-- existing public tables used by the current frontend.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

create schema if not exists catalog;
create schema if not exists app;
create schema if not exists private;

create table if not exists private.import_runs (
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  import_type text not null,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  records_seen integer not null default 0,
  records_inserted integer not null default 0,
  records_updated integer not null default 0,
  records_skipped integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  error_message text
);

create table if not exists private.import_errors (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid references private.import_runs(id) on delete cascade,
  source_key text not null,
  source_external_id text,
  step text not null,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists catalog.exercise_sources (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  base_url text,
  license text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists catalog.exercises (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references catalog.exercise_sources(id) on delete set null,
  source_external_id text,
  slug text not null unique,
  name_en text not null,
  description_en text,
  instructions_en text[] not null default '{}',
  difficulty text,
  is_active boolean not null default true,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, source_external_id)
);

create table if not exists catalog.muscles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  body_region text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists catalog.exercise_muscles (
  exercise_id uuid not null references catalog.exercises(id) on delete cascade,
  muscle_id uuid not null references catalog.muscles(id) on delete restrict,
  role text not null check (role in ('primary', 'secondary', 'stabilizer')),
  primary key (exercise_id, muscle_id, role)
);

create table if not exists catalog.equipment (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists catalog.exercise_equipment (
  exercise_id uuid not null references catalog.exercises(id) on delete cascade,
  equipment_id uuid not null references catalog.equipment(id) on delete restrict,
  primary key (exercise_id, equipment_id)
);

create table if not exists catalog.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists catalog.exercise_categories (
  exercise_id uuid not null references catalog.exercises(id) on delete cascade,
  category_id uuid not null references catalog.categories(id) on delete restrict,
  primary key (exercise_id, category_id)
);

create table if not exists catalog.exercise_aliases (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references catalog.exercises(id) on delete cascade,
  locale text not null default 'en',
  alias text not null,
  normalized_alias text not null,
  source text not null default 'manual',
  weight integer not null default 50 check (weight between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exercise_id, locale, normalized_alias)
);

create table if not exists catalog.translations (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  locale text not null,
  field text not null,
  value text not null,
  source text not null default 'manual',
  reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id, locale, field)
);

create table if not exists catalog.exercise_media (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references catalog.exercises(id) on delete cascade,
  type text not null check (type in ('thumbnail', 'image', 'video')),
  provider text not null default 'supabase',
  bucket text,
  path text,
  url text,
  source_url text,
  mime_type text,
  width integer,
  height integer,
  duration_seconds integer,
  checksum text,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (path is not null or url is not null),
  unique (provider, bucket, path)
);

create table if not exists catalog.exercise_search_documents (
  exercise_id uuid primary key references catalog.exercises(id) on delete cascade,
  locale text not null default 'en',
  search_text text not null,
  search_vector tsvector not null,
  updated_at timestamptz not null default now()
);

create table if not exists catalog.food_sources (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  base_url text,
  license text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists catalog.foods (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references catalog.food_sources(id) on delete set null,
  source_external_id text,
  name text not null,
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
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, source_external_id)
);

create table if not exists catalog.food_aliases (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references catalog.foods(id) on delete cascade,
  locale text not null,
  alias text not null,
  normalized_alias text not null,
  weight integer not null default 50 check (weight between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (food_id, locale, normalized_alias)
);

create table if not exists app.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.workout_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references app.workout_plans(id) on delete cascade,
  day_key text check (day_key in ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')),
  name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (day_key is not null or name is not null)
);

create table if not exists app.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null references app.workout_days(id) on delete cascade,
  exercise_id uuid references catalog.exercises(id) on delete set null,
  custom_name text,
  notes text,
  rest_seconds integer check (rest_seconds is null or rest_seconds >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (exercise_id is not null or custom_name is not null)
);

create table if not exists app.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references app.workout_exercises(id) on delete cascade,
  set_index integer not null check (set_index > 0),
  target_reps integer check (target_reps is null or target_reps >= 0),
  target_weight_kg numeric check (target_weight_kg is null or target_weight_kg >= 0),
  target_duration_seconds integer check (target_duration_seconds is null or target_duration_seconds >= 0),
  target_distance_m numeric check (target_distance_m is null or target_distance_m >= 0),
  unique (workout_exercise_id, set_index)
);

create table if not exists app.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references app.workout_plans(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references app.workout_sessions(id) on delete cascade,
  exercise_id uuid references catalog.exercises(id) on delete set null,
  workout_exercise_id uuid references app.workout_exercises(id) on delete set null,
  name_snapshot text not null,
  notes text,
  sort_order integer not null default 0
);

create table if not exists app.set_logs (
  id uuid primary key default gen_random_uuid(),
  exercise_log_id uuid not null references app.exercise_logs(id) on delete cascade,
  set_index integer not null check (set_index > 0),
  reps integer check (reps is null or reps >= 0),
  weight_kg numeric check (weight_kg is null or weight_kg >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  distance_m numeric check (distance_m is null or distance_m >= 0),
  rpe numeric check (rpe is null or (rpe >= 0 and rpe <= 10)),
  completed boolean not null default true
);

create table if not exists app.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references catalog.exercises(id) on delete cascade,
  metric text not null,
  value numeric not null,
  unit text not null,
  achieved_at timestamptz not null,
  source_set_log_id uuid references app.set_logs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists app.favorite_exercises (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references catalog.exercises(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

create table if not exists app.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  period text not null check (period in ('daily', 'weekly', 'monthly', 'custom')),
  title text not null,
  target_value numeric not null,
  current_value numeric not null default 0,
  unit text not null,
  starts_at date,
  ends_at date,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at timestamptz not null default now(),
  type text not null,
  value numeric not null,
  unit text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists app.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text,
  entity_id uuid,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.meal_entries (
  id uuid primary key default gen_random_uuid(),
  meal_log_id uuid not null references app.meal_logs(id) on delete cascade,
  food_id uuid references catalog.foods(id) on delete set null,
  name_snapshot text not null,
  quantity numeric not null check (quantity >= 0),
  unit text not null default 'g',
  calories_kcal numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  fiber_g numeric,
  sugar_g numeric,
  salt_g numeric,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exercises_source_external_idx on catalog.exercises (source_id, source_external_id);
create index if not exists exercises_name_trgm_idx on catalog.exercises using gin (name_en gin_trgm_ops);
create index if not exists exercise_muscles_muscle_idx on catalog.exercise_muscles (muscle_id, role);
create index if not exists exercise_aliases_lookup_idx on catalog.exercise_aliases (locale, normalized_alias);
create index if not exists exercise_aliases_trgm_idx on catalog.exercise_aliases using gin (normalized_alias gin_trgm_ops);
create index if not exists translations_lookup_idx on catalog.translations (entity_type, entity_id, locale, field);
create index if not exists exercise_media_lookup_idx on catalog.exercise_media (exercise_id, type, sort_order);
create unique index if not exists exercise_media_path_unique_idx on catalog.exercise_media (provider, bucket, path) where path is not null;
create index if not exists exercise_media_checksum_idx on catalog.exercise_media (checksum) where checksum is not null;
create index if not exists exercise_search_documents_fts_idx on catalog.exercise_search_documents using gin (search_vector);
create index if not exists foods_source_external_idx on catalog.foods (source_id, source_external_id);
create index if not exists foods_name_trgm_idx on catalog.foods using gin (name gin_trgm_ops);
create index if not exists foods_barcode_idx on catalog.foods (barcode) where barcode is not null;
create index if not exists food_aliases_lookup_idx on catalog.food_aliases (locale, normalized_alias);
create index if not exists food_aliases_trgm_idx on catalog.food_aliases using gin (normalized_alias gin_trgm_ops);

create index if not exists workout_plans_user_idx on app.workout_plans (user_id, updated_at desc);
create index if not exists workout_days_plan_idx on app.workout_days (plan_id, sort_order);
create index if not exists workout_exercises_day_idx on app.workout_exercises (workout_day_id, sort_order);
create index if not exists workout_exercises_exercise_idx on app.workout_exercises (exercise_id) where exercise_id is not null;
create index if not exists workout_sessions_user_idx on app.workout_sessions (user_id, started_at desc);
create index if not exists exercise_logs_session_idx on app.exercise_logs (session_id, sort_order);
create index if not exists exercise_logs_exercise_idx on app.exercise_logs (exercise_id) where exercise_id is not null;
create index if not exists set_logs_exercise_log_idx on app.set_logs (exercise_log_id, set_index);
create index if not exists personal_records_lookup_idx on app.personal_records (user_id, exercise_id, metric, value desc);
create index if not exists goals_user_idx on app.goals (user_id, status, period);
create index if not exists measurements_user_idx on app.measurements (user_id, type, measured_at desc);
create index if not exists notes_user_idx on app.notes (user_id, created_at desc);
create index if not exists notes_entity_idx on app.notes (entity_type, entity_id) where entity_type is not null and entity_id is not null;
create index if not exists meal_logs_user_date_idx on app.meal_logs (user_id, log_date, meal_type);
create index if not exists meal_entries_log_idx on app.meal_entries (meal_log_id, sort_order);

create trigger exercise_sources_set_updated_at
before update on catalog.exercise_sources
for each row execute function public.set_updated_at();

create trigger exercises_set_updated_at
before update on catalog.exercises
for each row execute function public.set_updated_at();

create trigger muscles_set_updated_at
before update on catalog.muscles
for each row execute function public.set_updated_at();

create trigger equipment_set_updated_at
before update on catalog.equipment
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on catalog.categories
for each row execute function public.set_updated_at();

create trigger exercise_aliases_set_updated_at
before update on catalog.exercise_aliases
for each row execute function public.set_updated_at();

create trigger translations_set_updated_at
before update on catalog.translations
for each row execute function public.set_updated_at();

create trigger exercise_media_set_updated_at
before update on catalog.exercise_media
for each row execute function public.set_updated_at();

create or replace function catalog.set_exercise_search_vector()
returns trigger
language plpgsql
as $$
begin
  new.search_vector = to_tsvector('simple', coalesce(new.search_text, ''));
  new.updated_at = now();
  return new;
end;
$$;

create trigger exercise_search_documents_set_vector
before insert or update on catalog.exercise_search_documents
for each row execute function catalog.set_exercise_search_vector();

create trigger food_sources_set_updated_at
before update on catalog.food_sources
for each row execute function public.set_updated_at();

create trigger foods_set_updated_at
before update on catalog.foods
for each row execute function public.set_updated_at();

create trigger food_aliases_set_updated_at
before update on catalog.food_aliases
for each row execute function public.set_updated_at();

create trigger workout_plans_set_updated_at
before update on app.workout_plans
for each row execute function public.set_updated_at();

create trigger workout_days_set_updated_at
before update on app.workout_days
for each row execute function public.set_updated_at();

create trigger workout_exercises_set_updated_at
before update on app.workout_exercises
for each row execute function public.set_updated_at();

create trigger workout_sessions_set_updated_at
before update on app.workout_sessions
for each row execute function public.set_updated_at();

create trigger goals_set_updated_at
before update on app.goals
for each row execute function public.set_updated_at();

create trigger notes_set_updated_at
before update on app.notes
for each row execute function public.set_updated_at();

create trigger meal_logs_set_updated_at
before update on app.meal_logs
for each row execute function public.set_updated_at();

create trigger meal_entries_set_updated_at
before update on app.meal_entries
for each row execute function public.set_updated_at();

alter table catalog.exercise_sources enable row level security;
alter table catalog.exercises enable row level security;
alter table catalog.muscles enable row level security;
alter table catalog.exercise_muscles enable row level security;
alter table catalog.equipment enable row level security;
alter table catalog.exercise_equipment enable row level security;
alter table catalog.categories enable row level security;
alter table catalog.exercise_categories enable row level security;
alter table catalog.exercise_aliases enable row level security;
alter table catalog.translations enable row level security;
alter table catalog.exercise_media enable row level security;
alter table catalog.exercise_search_documents enable row level security;
alter table catalog.food_sources enable row level security;
alter table catalog.foods enable row level security;
alter table catalog.food_aliases enable row level security;

alter table app.workout_plans enable row level security;
alter table app.workout_days enable row level security;
alter table app.workout_exercises enable row level security;
alter table app.workout_sets enable row level security;
alter table app.workout_sessions enable row level security;
alter table app.exercise_logs enable row level security;
alter table app.set_logs enable row level security;
alter table app.personal_records enable row level security;
alter table app.favorite_exercises enable row level security;
alter table app.goals enable row level security;
alter table app.measurements enable row level security;
alter table app.notes enable row level security;
alter table app.meal_logs enable row level security;
alter table app.meal_entries enable row level security;

create policy "Catalog sources are readable"
on catalog.exercise_sources for select
to anon, authenticated
using (true);

create policy "Catalog exercises are readable"
on catalog.exercises for select
to anon, authenticated
using (is_active);

create policy "Catalog muscles are readable"
on catalog.muscles for select
to anon, authenticated
using (true);

create policy "Catalog exercise muscles are readable"
on catalog.exercise_muscles for select
to anon, authenticated
using (true);

create policy "Catalog equipment is readable"
on catalog.equipment for select
to anon, authenticated
using (true);

create policy "Catalog exercise equipment is readable"
on catalog.exercise_equipment for select
to anon, authenticated
using (true);

create policy "Catalog categories are readable"
on catalog.categories for select
to anon, authenticated
using (true);

create policy "Catalog exercise categories are readable"
on catalog.exercise_categories for select
to anon, authenticated
using (true);

create policy "Catalog aliases are readable"
on catalog.exercise_aliases for select
to anon, authenticated
using (true);

create policy "Catalog translations are readable"
on catalog.translations for select
to anon, authenticated
using (true);

create policy "Catalog media are readable"
on catalog.exercise_media for select
to anon, authenticated
using (true);

create policy "Catalog search documents are readable"
on catalog.exercise_search_documents for select
to anon, authenticated
using (true);

create policy "Food sources are readable"
on catalog.food_sources for select
to anon, authenticated
using (true);

create policy "Foods are readable"
on catalog.foods for select
to anon, authenticated
using (true);

create policy "Food aliases are readable"
on catalog.food_aliases for select
to anon, authenticated
using (true);

create policy "Users manage their workout plans"
on app.workout_plans for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage workout days through owned plans"
on app.workout_days for all
to authenticated
using (exists (
  select 1 from app.workout_plans p
  where p.id = workout_days.plan_id and p.user_id = (select auth.uid())
))
with check (exists (
  select 1 from app.workout_plans p
  where p.id = workout_days.plan_id and p.user_id = (select auth.uid())
));

create policy "Users manage workout exercises through owned days"
on app.workout_exercises for all
to authenticated
using (exists (
  select 1
  from app.workout_days d
  join app.workout_plans p on p.id = d.plan_id
  where d.id = workout_exercises.workout_day_id
    and p.user_id = (select auth.uid())
))
with check (exists (
  select 1
  from app.workout_days d
  join app.workout_plans p on p.id = d.plan_id
  where d.id = workout_exercises.workout_day_id
    and p.user_id = (select auth.uid())
));

create policy "Users manage workout sets through owned exercises"
on app.workout_sets for all
to authenticated
using (exists (
  select 1
  from app.workout_exercises we
  join app.workout_days d on d.id = we.workout_day_id
  join app.workout_plans p on p.id = d.plan_id
  where we.id = workout_sets.workout_exercise_id
    and p.user_id = (select auth.uid())
))
with check (exists (
  select 1
  from app.workout_exercises we
  join app.workout_days d on d.id = we.workout_day_id
  join app.workout_plans p on p.id = d.plan_id
  where we.id = workout_sets.workout_exercise_id
    and p.user_id = (select auth.uid())
));

create policy "Users manage their workout sessions"
on app.workout_sessions for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage exercise logs through owned sessions"
on app.exercise_logs for all
to authenticated
using (exists (
  select 1 from app.workout_sessions s
  where s.id = exercise_logs.session_id and s.user_id = (select auth.uid())
))
with check (exists (
  select 1 from app.workout_sessions s
  where s.id = exercise_logs.session_id and s.user_id = (select auth.uid())
));

create policy "Users manage set logs through owned sessions"
on app.set_logs for all
to authenticated
using (exists (
  select 1
  from app.exercise_logs el
  join app.workout_sessions s on s.id = el.session_id
  where el.id = set_logs.exercise_log_id
    and s.user_id = (select auth.uid())
))
with check (exists (
  select 1
  from app.exercise_logs el
  join app.workout_sessions s on s.id = el.session_id
  where el.id = set_logs.exercise_log_id
    and s.user_id = (select auth.uid())
));

create policy "Users manage their personal records"
on app.personal_records for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their favorite exercises"
on app.favorite_exercises for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their goals"
on app.goals for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their measurements"
on app.measurements for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their notes"
on app.notes for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their meal logs"
on app.meal_logs for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage meal entries through owned meal logs"
on app.meal_entries for all
to authenticated
using (exists (
  select 1 from app.meal_logs l
  where l.id = meal_entries.meal_log_id and l.user_id = (select auth.uid())
))
with check (exists (
  select 1 from app.meal_logs l
  where l.id = meal_entries.meal_log_id and l.user_id = (select auth.uid())
));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-media',
  'exercise-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Exercise media can be read publicly"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'exercise-media');

grant usage on schema catalog to anon, authenticated;
grant usage on schema app to authenticated;

grant select on all tables in schema catalog to anon, authenticated;
grant select, insert, update, delete on all tables in schema app to authenticated;

alter default privileges in schema catalog grant select on tables to anon, authenticated;
alter default privileges in schema app grant select, insert, update, delete on tables to authenticated;
