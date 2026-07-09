# Database Architecture

Questo documento definisce il modello dati target di FitPulse. Le migrazioni
attuali sono considerate una base iniziale, non lo schema finale enterprise.

## Principi

- Supabase Auth e la sorgente degli utenti. Non creare una tabella `users`
  duplicata.
- `profiles` contiene solo il profilo applicativo collegato a `auth.users`.
- Separare cataloghi globali e dati personali.
- I cataloghi importati da API esterne devono essere normalizzati.
- I dati importati mantengono sempre il valore originale inglese.
- Le traduzioni sono dati separati e revisionabili.
- Le tabelle esposte via Supabase devono avere RLS abilitata.
- Le tabelle ad alto volume devono avere indici progettati per le query reali.

## Schemi Logici

Per ora si puo usare `public`, ma a medio termine conviene separare:

- `public`: viste/API sicure usate dal frontend.
- `catalog`: esercizi, alimenti, media, traduzioni.
- `app`: dati utente e dominio applicativo.
- `private`: job/import log, staging, dati tecnici non esposti.

Supabase espone facilmente `public`; usare schemi separati riduce il rischio di
esporre tabelle interne.

## Auth e Profilo

### `profiles`

Scopo: profilo utente collegato a Supabase Auth.

Colonne:

- `id uuid primary key references auth.users(id) on delete cascade`
- `display_name text`
- `avatar_media_id uuid null`
- `unit_system text not null default 'metric'`
- `birth_date date null`
- `gender text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indici:

- PK su `id`

Vincoli:

- `unit_system in ('metric', 'imperial')`

### `user_settings`

Scopo: preferenze utente.

Colonne:

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `language text not null default 'it'`
- `theme_id text not null default 'default'`
- `accent_color text null`
- `on_accent_color text null`
- `navbar_color text null`
- `body_bg_color text null`
- `rest_duration_seconds integer not null default 30`
- `notification_settings jsonb not null default '{}'::jsonb`
- `privacy_settings jsonb not null default '{}'::jsonb`
- timestamps

Indici:

- PK su `user_id`

## Catalogo Esercizi

### `exercise_sources`

Scopo: provider sorgente dati, per esempio Free Exercise DB o ExerciseDB.

Colonne:

- `id uuid primary key`
- `key text not null unique`
- `name text not null`
- `base_url text null`
- `license text null`
- `metadata jsonb not null default '{}'::jsonb`
- timestamps

### `exercises`

Scopo: esercizio canonico globale.

Colonne:

- `id uuid primary key`
- `source_id uuid references exercise_sources(id)`
- `source_external_id text`
- `slug text not null unique`
- `name_en text not null`
- `description_en text null`
- `instructions_en text[] not null default '{}'`
- `difficulty text null`
- `is_active boolean not null default true`
- `raw_payload jsonb not null default '{}'::jsonb`
- timestamps

Relazioni:

- many-to-many con `muscles`, `equipment`, `categories`
- one-to-many con `exercise_media`, `exercise_aliases`, `translations`

Indici:

- `unique (source_id, source_external_id)`
- `unique (slug)`
- GIN su documento FTS generato
- opzionale trigram su `name_en`

### `muscles`

Scopo: muscoli normalizzati.

Colonne:

- `id uuid primary key`
- `slug text not null unique`
- `name_en text not null`
- `body_region text null`
- timestamps

### `exercise_muscles`

Scopo: relazione esercizio-muscolo.

Colonne:

- `exercise_id uuid references exercises(id) on delete cascade`
- `muscle_id uuid references muscles(id)`
- `role text not null`

Vincoli:

- PK composita `(exercise_id, muscle_id, role)`
- `role in ('primary', 'secondary', 'stabilizer')`

Indici:

- `(muscle_id, role)`

### `equipment`

Scopo: attrezzatura normalizzata.

Colonne:

- `id uuid primary key`
- `slug text not null unique`
- `name_en text not null`
- timestamps

### `exercise_equipment`

Scopo: relazione esercizio-attrezzatura.

Colonne:

- `exercise_id uuid references exercises(id) on delete cascade`
- `equipment_id uuid references equipment(id)`

Vincoli:

- PK composita `(exercise_id, equipment_id)`

### `categories`

Scopo: categorie funzionali, per esempio strength, cardio, mobility.

Colonne:

- `id uuid primary key`
- `slug text not null unique`
- `name_en text not null`
- timestamps

### `exercise_categories`

Scopo: relazione esercizio-categoria.

Colonne:

- `exercise_id uuid references exercises(id) on delete cascade`
- `category_id uuid references categories(id)`

Vincoli:

- PK composita `(exercise_id, category_id)`

### `exercise_aliases`

Scopo: sinonimi, abbreviazioni, errori comuni e varianti di ricerca.

Colonne:

- `id uuid primary key`
- `exercise_id uuid references exercises(id) on delete cascade`
- `locale text not null default 'en'`
- `alias text not null`
- `normalized_alias text not null`
- `source text not null default 'manual'`
- `weight integer not null default 50`
- timestamps

Indici:

- `(exercise_id, locale)`
- `unique (locale, normalized_alias, exercise_id)`
- trigram su `normalized_alias`

### `translations`

Scopo: traduzioni revisionabili senza alterare il dato canonico inglese.

Colonne:

- `id uuid primary key`
- `entity_type text not null`
- `entity_id uuid not null`
- `locale text not null`
- `field text not null`
- `value text not null`
- `source text not null default 'manual'`
- `reviewed boolean not null default false`
- timestamps

Indici:

- `unique (entity_type, entity_id, locale, field)`
- `(locale, entity_type)`

### `exercise_media`

Scopo: immagini e video provider-agnostic.

Colonne:

- `id uuid primary key`
- `exercise_id uuid references exercises(id) on delete cascade`
- `type text not null`
- `provider text not null default 'supabase'`
- `bucket text null`
- `path text null`
- `url text null`
- `source_url text null`
- `mime_type text null`
- `width integer null`
- `height integer null`
- `duration_seconds integer null`
- `checksum text null`
- `sort_order integer not null default 0`
- `metadata jsonb not null default '{}'::jsonb`
- timestamps

Vincoli:

- `type in ('thumbnail', 'image', 'video')`
- almeno uno tra `path` e `url`

Indici:

- `(exercise_id, type, sort_order)`
- `unique (provider, bucket, path)`
- `checksum`

## Workout Utente

### `workout_plans`

Scopo: piano/scheda principale dell'utente.

Colonne:

- `id uuid primary key`
- `user_id uuid references auth.users(id) on delete cascade`
- `name text not null`
- `description text null`
- `is_template boolean not null default false`
- timestamps

Indici:

- `(user_id, updated_at desc)`

### `workout_days`

Scopo: giorno o blocco del piano.

Colonne:

- `id uuid primary key`
- `plan_id uuid references workout_plans(id) on delete cascade`
- `day_key text null`
- `name text null`
- `sort_order integer not null default 0`
- timestamps

Indici:

- `(plan_id, sort_order)`

### `workout_exercises`

Scopo: esercizio programmato dentro un workout day.

Colonne:

- `id uuid primary key`
- `workout_day_id uuid references workout_days(id) on delete cascade`
- `exercise_id uuid null references exercises(id) on delete set null`
- `custom_name text null`
- `notes text null`
- `rest_seconds integer null`
- `sort_order integer not null default 0`
- timestamps

Indici:

- `(workout_day_id, sort_order)`
- `(exercise_id)`

### `workout_sets`

Scopo: set programmati.

Colonne:

- `id uuid primary key`
- `workout_exercise_id uuid references workout_exercises(id) on delete cascade`
- `set_index integer not null`
- `target_reps integer null`
- `target_weight_kg numeric null`
- `target_duration_seconds integer null`
- `target_distance_m numeric null`

Vincoli:

- `unique (workout_exercise_id, set_index)`

### `workout_sessions`

Scopo: allenamento realmente eseguito.

Colonne:

- `id uuid primary key`
- `user_id uuid references auth.users(id) on delete cascade`
- `plan_id uuid null references workout_plans(id) on delete set null`
- `started_at timestamptz not null`
- `ended_at timestamptz null`
- `status text not null default 'active'`
- `notes text null`

Indici:

- `(user_id, started_at desc)`

### `exercise_logs`

Scopo: esercizio eseguito dentro una sessione.

Colonne:

- `id uuid primary key`
- `session_id uuid references workout_sessions(id) on delete cascade`
- `exercise_id uuid null references exercises(id) on delete set null`
- `workout_exercise_id uuid null references workout_exercises(id) on delete set null`
- `name_snapshot text not null`
- `notes text null`
- `sort_order integer not null default 0`

Indici:

- `(session_id, sort_order)`
- `(exercise_id)`

### `set_logs`

Scopo: set reale registrato.

Colonne:

- `id uuid primary key`
- `exercise_log_id uuid references exercise_logs(id) on delete cascade`
- `set_index integer not null`
- `reps integer null`
- `weight_kg numeric null`
- `duration_seconds integer null`
- `distance_m numeric null`
- `rpe numeric null`
- `completed boolean not null default true`

Indici:

- `(exercise_log_id, set_index)`

### `personal_records`

Scopo: record personali calcolati o confermati.

Colonne:

- `id uuid primary key`
- `user_id uuid references auth.users(id) on delete cascade`
- `exercise_id uuid references exercises(id) on delete cascade`
- `metric text not null`
- `value numeric not null`
- `unit text not null`
- `achieved_at timestamptz not null`
- `source_set_log_id uuid null references set_logs(id) on delete set null`

Indici:

- `(user_id, exercise_id, metric, value desc)`
- `(user_id, achieved_at desc)`

### `favorite_exercises`

Scopo: preferiti utente.

Colonne:

- `user_id uuid references auth.users(id) on delete cascade`
- `exercise_id uuid references exercises(id) on delete cascade`
- `created_at timestamptz not null default now()`

Vincoli:

- PK composita `(user_id, exercise_id)`

## Obiettivi, Misure, Note

### `goals`

Scopo: obiettivi flessibili.

Colonne:

- `id uuid primary key`
- `user_id uuid references auth.users(id) on delete cascade`
- `type text not null`
- `period text not null`
- `title text not null`
- `target_value numeric not null`
- `current_value numeric not null default 0`
- `unit text not null`
- `starts_at date null`
- `ends_at date null`
- `status text not null default 'active'`
- timestamps

Indici:

- `(user_id, status, period)`

### `measurements`

Scopo: misure corporee nel tempo.

Colonne:

- `id uuid primary key`
- `user_id uuid references auth.users(id) on delete cascade`
- `measured_at timestamptz not null`
- `type text not null`
- `value numeric not null`
- `unit text not null`
- `notes text null`

Indici:

- `(user_id, type, measured_at desc)`

### `notes`

Scopo: note utente collegabili a dominio.

Colonne:

- `id uuid primary key`
- `user_id uuid references auth.users(id) on delete cascade`
- `entity_type text null`
- `entity_id uuid null`
- `body text not null`
- timestamps

Indici:

- `(user_id, created_at desc)`
- `(entity_type, entity_id)`

## Nutrizione

### `food_sources`

Scopo: provider dati alimenti.

Colonne:

- `id uuid primary key`
- `key text not null unique`
- `name text not null`
- `base_url text null`
- `license text null`
- timestamps

### `foods`

Scopo: alimento canonico globale.

Colonne:

- `id uuid primary key`
- `source_id uuid references food_sources(id)`
- `source_external_id text`
- `name text not null`
- `brand text null`
- `barcode text null`
- `serving_size numeric null`
- `serving_unit text null`
- `calories_kcal numeric null`
- `protein_g numeric null`
- `carbs_g numeric null`
- `fat_g numeric null`
- `fiber_g numeric null`
- `sugar_g numeric null`
- `salt_g numeric null`
- `raw_payload jsonb not null default '{}'::jsonb`
- timestamps

Indici:

- `unique (source_id, source_external_id)`
- `barcode`
- GIN FTS su `name`, `brand`, `barcode`

### `food_aliases`

Scopo: ricerca alimenti con sinonimi e traduzioni.

Colonne:

- `id uuid primary key`
- `food_id uuid references foods(id) on delete cascade`
- `locale text not null`
- `alias text not null`
- `normalized_alias text not null`
- `weight integer not null default 50`

Indici:

- `(locale, normalized_alias)`
- trigram su `normalized_alias`

### `meal_logs`

Scopo: pasto o gruppo alimentare giornaliero.

Colonne:

- `id uuid primary key`
- `user_id uuid references auth.users(id) on delete cascade`
- `log_date date not null`
- `meal_type text not null`
- `note text null`
- timestamps

Indici:

- `(user_id, log_date, meal_type)`

### `meal_entries`

Scopo: alimento inserito in un pasto.

Colonne:

- `id uuid primary key`
- `meal_log_id uuid references meal_logs(id) on delete cascade`
- `food_id uuid null references foods(id) on delete set null`
- `name_snapshot text not null`
- `quantity numeric not null`
- `unit text not null`
- nutrienti snapshot
- `sort_order integer not null default 0`
- timestamps

Indici:

- `(meal_log_id, sort_order)`

## Tabelle Da Evitare o Rinominare

- `users`: inutile, usare `auth.users` + `profiles`.
- `catalog_exercises`: troppo generica/piatta per il modello finale. Va sostituita
  da `exercises` normalizzata.
- `exercises` come tabella utente: ambigua. Nel modello finale deve diventare
  `workout_exercises`.
- `ring_settings`: puo essere assorbita da `goals` e `user_settings`, salvo
  esigenze UI molto specifiche.
