-- Prodotti NASCOSTI dall'utente.
--
-- Perche' non una DELETE: `public.food_items` e' il catalogo CONDIVISO (223.000
-- righe importate da Open Food Facts e FoodData Central, piu' i generici curati
-- da noi). Se un utente potesse cancellarne una riga, la toglierebbe a tutti —
-- ed e' anche il motivo per cui la RLS lo vieta. "Elimina" dal punto di vista di
-- chi lo preme significa "non voglio piu' vederlo": qui si registra esattamente
-- quello, per utente.
--
-- Riga = (utente, prodotto). Chiave primaria composta: nascondere due volte lo
-- stesso prodotto non e' un errore, e non servono id sintetici.
create table if not exists public.hidden_food_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  food_id uuid not null references public.food_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, food_id)
);

-- Si legge sempre "tutti i nascosti dell'utente corrente": indice sull'utente.
create index if not exists hidden_food_items_user_idx
  on public.hidden_food_items (user_id);

alter table public.hidden_food_items enable row level security;

-- Ognuno vede e governa SOLO i propri: e' una preferenza personale, non un dato
-- di catalogo. Quattro policy separate perche' `for all` non permette di
-- distinguere `using` da `with check` in modo leggibile.
drop policy if exists "Hidden foods are readable by owner" on public.hidden_food_items;
create policy "Hidden foods are readable by owner" on public.hidden_food_items
  for select using (auth.uid() = user_id);

drop policy if exists "Hidden foods are insertable by owner" on public.hidden_food_items;
create policy "Hidden foods are insertable by owner" on public.hidden_food_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "Hidden foods are deletable by owner" on public.hidden_food_items;
create policy "Hidden foods are deletable by owner" on public.hidden_food_items
  for delete using (auth.uid() = user_id);
