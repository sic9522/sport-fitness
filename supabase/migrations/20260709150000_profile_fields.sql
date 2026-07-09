-- Campi profilo raccolti nel wizard di registrazione. Estende public.profiles
-- (gia' creata dal trigger handle_new_user al signup).
-- Anagrafica come colonne tipizzate; `details` jsonb per i dati fisici e i campi
-- futuri (sesso, obiettivi, livello attivita', preferenze alimentari, ecc.) cosi'
-- da poterli aggiungere senza nuove migrazioni.
--
-- Da eseguire nel SQL Editor. RLS gia' presente: "Users can manage their own profile".

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists birth_date date,
  add column if not exists phone text,
  add column if not exists city text,
  add column if not exists address text,
  add column if not exists postal_code text,
  add column if not exists height_cm numeric check (height_cm is null or height_cm > 0),
  add column if not exists weight_kg numeric check (weight_kg is null or weight_kg > 0),
  add column if not exists details jsonb not null default '{}'::jsonb;
