# API Design

Questo documento descrive l'uso delle API interne ed esterne.

## Regola Principale

Le API esterne non vanno chiamate dal frontend React quando richiedono segreti,
rate limit privati o trasformazioni massive. Il frontend legge dal nostro
database Supabase.

## API Esterne

### ExerciseDB / Free Exercise DB

Uso previsto:

- sorgente iniziale del catalogo esercizi
- non sorgente runtime finale
- dati importati e normalizzati in PostgreSQL
- immagini importate su Supabase Storage

Campi attesi da normalizzare:

- id sorgente
- nome inglese
- descrizione/istruzioni inglesi
- muscoli
- attrezzatura
- categoria/body part
- immagini
- payload originale

Chiavi:

- non devono essere esposte nel frontend
- devono stare in `.env` locali o secret environment lato server

### API Nutrizione

Uso previsto:

- sorgente catalogo alimenti
- import/sync in tabelle `foods`, `food_aliases`, traduzioni se disponibili
- ricerca e diario alimentare leggono dal nostro DB

Provider da decidere.

## API Interne Frontend

Il frontend deve parlare con servizi applicativi, non direttamente con query
Supabase sparse nei componenti.

Servizi target:

- `authService`
- `exerciseCatalogService`
- `workoutService`
- `nutritionService`
- `profileService`
- `settingsService`

## Contratti

### Ricerca Esercizi

Input:

- `query`
- `locale`
- filtri opzionali: muscle, equipment, category, difficulty
- `limit`
- `cursor` o `page`

Output:

- `id`
- `slug`
- `name`
- `name_en`
- `thumbnail_url`
- `primary_muscles`
- `equipment`
- `rank`

Note:

- ricerca server-side
- niente caricamento completo catalogo nel client
- ranking basato su nome, alias, traduzioni e fuzzy match

### Dettaglio Esercizio

Output:

- esercizio canonico
- traduzioni disponibili
- media ordinati
- muscoli
- equipment
- categorie
- alias principali

### Workout Utente

Operazioni:

- lista piani
- dettaglio piano
- crea/modifica piano
- aggiungi esercizio da catalogo o custom
- registra sessione
- registra set
- calcola record personali

## Import API

Gli importer devono essere idempotenti.

Requisiti:

- `source_key`
- `source_external_id`
- slug stabile
- upsert controllati
- logging import
- gestione duplicati
- retry download immagini
- checksum media
- nessuna cancellazione distruttiva automatica

### Import Esercizi

Script attuale:

```bash
npm run import:exercises -- --json data/exercises.json --images-dir data/exercises
```

Modalita:

- `--dry-run`: valida e trasforma senza scrivere.
- `--skip-images`: importa solo righe database.

Ambiente richiesto:

- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EXERCISE_IMPORT_SOURCE_KEY`
- `EXERCISE_IMPORT_SOURCE_NAME`

Nota Supabase:

Lo script usa Supabase JS e gli schemi `catalog` e `private`. Nel progetto
Supabase reale questi schemi dovranno essere disponibili alle API, oppure lo
script dovra essere convertito a connessione PostgreSQL diretta per mantenere
`private` completamente fuori da PostgREST.

## Error Handling

Classi errore:

- configurazione mancante
- API esterna non raggiungibile
- rate limit
- payload invalido
- conflitto slug
- upload storage fallito
- vincolo database fallito

Gli script devono loggare e proseguire dove possibile, ma fallire in modo chiaro
quando l'integrita dei dati e a rischio.
