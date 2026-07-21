-- Recupero per-scheda (`scheda.rest` nel modello locale), finora non mappato sul cloud.
-- Il tempo di recupero è passato dall'essere globale (timer dell'app) a essere una
-- proprietà della singola scheda, scelta con RestPicker in src/components/SchedaView.jsx.
-- Senza questa colonna il valore resta solo in locale e si perde cambiando dispositivo.

-- Secondi di recupero fra le serie. NULL = non impostato: la scheda ricade sul valore
-- predefinito del timer, che è esattamente il comportamento del modello locale
-- (il fallback vive nel frontend, quindi qui non si mette un default numerico).
alter table public.workout_cards
  add column if not exists rest_seconds integer
  check (rest_seconds is null or rest_seconds >= 0);
