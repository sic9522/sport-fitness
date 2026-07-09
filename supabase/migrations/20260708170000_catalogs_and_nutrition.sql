-- Global API catalogs and user nutrition diary.
-- Catalog tables store data imported from external APIs and are shared across users.

create table public.catalog_exercises (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_id text not null,
  name text not null,
  description text,
  category text,
  equipment text,
  primary_muscles text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  difficulty text,
  image_url text,
  video_url text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id)
);

create table public.food_items (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_id text not null,
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
  unique (source, source_id)
);

create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  meal_type text not null default 'other' check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meal_entries (
  id uuid primary key default gen_random_uuid(),
  meal_log_id uuid not null references public.meal_logs(id) on delete cascade,
  food_item_id uuid references public.food_items(id) on delete set null,
  name text not null,
  quantity numeric not null default 1 check (quantity >= 0),
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

create index catalog_exercises_name_idx on public.catalog_exercises using gin (to_tsvector('simple', name));
create index catalog_exercises_muscles_idx on public.catalog_exercises using gin (primary_muscles, secondary_muscles);
create index food_items_name_idx on public.food_items using gin (to_tsvector('simple', name));
create index food_items_barcode_idx on public.food_items (barcode) where barcode is not null;
create index meal_logs_user_date_idx on public.meal_logs (user_id, log_date, meal_type);
create index meal_entries_log_idx on public.meal_entries (meal_log_id, sort_order);

create trigger catalog_exercises_set_updated_at
before update on public.catalog_exercises
for each row execute function public.set_updated_at();

create trigger food_items_set_updated_at
before update on public.food_items
for each row execute function public.set_updated_at();

create trigger meal_logs_set_updated_at
before update on public.meal_logs
for each row execute function public.set_updated_at();

create trigger meal_entries_set_updated_at
before update on public.meal_entries
for each row execute function public.set_updated_at();

alter table public.catalog_exercises enable row level security;
alter table public.food_items enable row level security;
alter table public.meal_logs enable row level security;
alter table public.meal_entries enable row level security;

create policy "Catalog exercises are readable"
on public.catalog_exercises
for select
using (true);

create policy "Food items are readable"
on public.food_items
for select
using (true);

create policy "Users can manage their own meal logs"
on public.meal_logs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage entries from their own meal logs"
on public.meal_entries
for all
using (
  exists (
    select 1
    from public.meal_logs l
    where l.id = meal_entries.meal_log_id
      and l.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.meal_logs l
    where l.id = meal_entries.meal_log_id
      and l.user_id = auth.uid()
  )
);
