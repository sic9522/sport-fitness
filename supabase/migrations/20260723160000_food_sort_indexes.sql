-- Indici per l'ORDINAMENTO della pagina Prodotti (select "kcal / proteine / …").
--
-- Perche' servono: ordinare 223.000 righe per un nutriente senza indice obbliga
-- Postgres a leggerle e ordinarle tutte per restituirne 50. Misurato via REST
-- sul progetto vero: `order by calories_kcal desc limit 3` = **2,4 secondi**.
-- Non e' un timeout, ma e' un'attesa che si sente a ogni cambio di select.
--
-- `nulls last` nell'indice perche' e' l'ordine che usa l'app: un nutriente non
-- dichiarato non deve occupare la testa della classifica (vedi `sortFoods` e
-- `listFoodItems`). Un indice con lo STESSO ordine della query e' quello che
-- Postgres puo' scorrere senza riordinare niente.
--
-- Non e' obbligatoria: senza, la pagina funziona lo stesso, solo piu' lenta.

create index if not exists food_items_kcal_idx
  on public.food_items (calories_kcal desc nulls last);

create index if not exists food_items_protein_idx
  on public.food_items (protein_g desc nulls last);

create index if not exists food_items_carbs_idx
  on public.food_items (carbs_g desc nulls last);

create index if not exists food_items_fat_idx
  on public.food_items (fat_g desc nulls last);

create index if not exists food_items_sugar_idx
  on public.food_items (sugar_g desc nulls last);

create index if not exists food_items_fiber_idx
  on public.food_items (fiber_g desc nulls last);
