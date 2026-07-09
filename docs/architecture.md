# Architecture

FitPulse deve essere progettata come piattaforma fitness scalabile, non come
demo. L'obiettivo architetturale e supportare crescita verso oltre 1.000.000 di
utenti mantenendo codice semplice da evolvere.

## Stack

Frontend:

- React
- Vite
- Supabase JS client

Backend:

- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Supabase Edge Functions o script server-side per import e job sensibili

## Principi Guida

- Il frontend non deve contenere chiavi private.
- Le API esterne non devono essere chiamate direttamente dal client React.
- I cataloghi globali devono essere importati nel nostro database.
- I dati personali devono essere protetti da RLS.
- Le operazioni massive devono stare fuori dal runtime utente.
- Le migrazioni devono essere idempotenti quando possibile e revisionabili.
- Il codice React deve restare diviso per dominio, non per tecnologia soltanto.

## Architettura Logica

### Client

Il client React gestisce:

- routing
- UI
- stato locale transitorio
- sessione Supabase
- chiamate a servizi applicativi

Non deve gestire:

- service role key
- import dataset
- download immagini remote
- trasformazioni massive
- segreti RapidAPI o provider esterni

### Supabase

Supabase gestisce:

- autenticazione
- autorizzazione via RLS
- database relazionale
- file storage
- funzioni server-side quando servono segreti o job controllati

### Import Pipeline

Il dataset iniziale `exercises.json` e le immagini del repository Free Exercise
DB sono sorgenti dati iniziali, non il database finale.

Pipeline consigliata:

1. leggere JSON sorgente
2. validare struttura
3. normalizzare esercizi, muscoli, equipment, categorie
4. generare slug stabili
5. generare alias iniziali
6. scaricare immagini
7. ottimizzare/convertire immagini
8. caricare immagini su Supabase Storage
9. salvare media in database
10. scrivere log import

La pipeline deve essere rilanciabile senza duplicare dati.

## Struttura Frontend Target

Struttura consigliata futura:

```text
src/
  app/
    router.jsx
    providers.jsx
  domains/
    auth/
    workouts/
    exercises/
    nutrition/
    profile/
    settings/
  shared/
    components/
    hooks/
    lib/
    services/
    utils/
```

Il progetto attuale puo migrare gradualmente: non serve bloccare lo sviluppo per
un grande refactor immediato.

## Performance

Priorita:

- query indicizzate e misurate con `explain`
- paginazione sempre sui cataloghi
- ricerca server-side, non filtro client su grandi dataset
- immagini tramite CDN/storage pubblico controllato
- lazy loading delle pagine pesanti
- caching dei cataloghi statici quando possibile

## Scalabilita

Per 1M+ utenti:

- evitare query senza `user_id` sulle tabelle utente
- evitare JSONB come sostituto di relazioni dove servono filtri
- usare partitioning futuro su log ad alto volume se necessario
- separare cataloghi globali da eventi utente
- mantenere dati storici append-only dove possibile
- introdurre job asincroni per import, analytics e ricalcoli

## Sicurezza

- RLS su tutte le tabelle esposte.
- Service role solo in script sicuri o Edge Functions.
- Storage policy bucket-aware.
- Nessun segreto in `VITE_*` tranne chiavi pubbliche.
- Import API esterne eseguito lato server.

## Osservabilita

Da prevedere:

- `import_runs`
- `import_errors`
- logging script
- conteggio righe importate/aggiornate/skippate
- checksum immagini
- versionamento sorgente dati

## Stato Attuale

Gia presenti:

- React/Vite
- Supabase client
- Auth context
- pagine Login/Registrazione/Profilo
- migrazioni iniziali
- documentazione iniziale

Da correggere prima della fase enterprise:

- schema catalogo troppo piatto
- tabella `exercises` ambigua
- mancano `exercises.json` e immagini nel workspace
- dati runtime ancora in `localStorage`
- ricerca cataloghi ancora basica con `ilike`
