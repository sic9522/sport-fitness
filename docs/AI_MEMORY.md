# AI shared memory

Punto d'ingresso condiviso tra Codex e Claude. Chi apre il progetto legge
questo file per primo: da qui si capisce lo stato reale e da dove ripartire.
Questa cartella `docs/` e' la FONTE DI VERITA' unica di progetto, versionata nel
repo e leggibile da entrambi gli agenti. (La memoria personale di Claude in
`.claude/` resta un suo indice privato, ma non e' condivisa: il contenuto che
deve valere per tutti sta qui.)

## Ordine di lettura all'avvio

1. Questo file (`AI_MEMORY.md`) - stato attuale + prossimi passi.
2. `frontend.md` - com'e' fatta l'app che gira OGGI (React + localStorage).
3. `architecture.md` - visione target backend/scalabilita.
4. `database.md` - schema Supabase (migrazioni, tabelle, RLS).
5. `api.md` - contratti servizi e import API esterne.
6. `roadmap.md` - fasi 0-8.
7. `decisions.md` - ADR (decisioni bloccate, non ridiscutere senza motivo).

## Stato attuale (riconciliato)

Due mondi coesistono e NON vanno confusi:

- FRONTEND RUNTIME (cio' che gira davvero): React 19 + Vite, stato in
  `localStorage`. Funzionante: Home (anelli/obiettivi), Palestra
  (giornate>schede>esercizi, swipe/riordino/stati), Timer di recupero,
  Impostazioni (colori/obiettivi/lingua), i18n 5 lingue, tema dark/light.
  Dettagli in `frontend.md`.
- BACKEND SCAFFOLDED (predisposto, NON ancora collegato alla UI): Supabase
  client, `AuthContext`/`AuthShell`, pagine Login/Registrazione/Profilo su
  Supabase Auth, migrazioni SQL, servizi (`workouts`, `catalogs`), importer
  esercizi. Dettagli in `database.md`/`api.md`.

Il ponte tra i due (migrazione `localStorage` -> Supabase) e' la Fase 5 della
roadmap e NON e' ancora fatto. Finche' non e' fatto, la sorgente dati runtime
resta `localStorage`.

Da NON dare per scontato:

- Le migrazioni Supabase NON sono ancora applicate su un progetto reale.
- Manca `.env.local` con `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- Mancano `exercises.json` e le immagini per l'importer.
- Prossimo bivio prodotto: scegliere/confermare le API catalogo (esercizi:
  ExerciseDB o Free Exercise DB; alimenti: provider da decidere).

## Regole di lavoro condivise

- Non sovrascrivere modifiche non committate altrui: frontend (Claude) e
  backend/docs (Codex) procedono in parallelo.
- Commit a nome del solo utente (Simone), niente trailer Co-Authored-By.
- Aggiornare questo file quando si prende una decisione o si cambia stato,
  con una nuova voce datata sotto "Log".

## Log

### 2026-07-09 - Claude (auth + registrazione wizard)

- Sistema auth/registrazione modulare su Supabase Auth. Icona utente in alto a
  destra = `components/auth/UserMenu`: non loggato -> `LoginModal`
  (email/password + Google), loggato -> menu (Profilo/Impostazioni/Esci).
- Provider OAuth estendibili: `lib/authProviders.js` (oggi Google) +
  `ProviderButtons`. Servizi: `services/auth.js`, `services/profile.js`.
- Registrazione = wizard 3 step (metodo / anagrafica / fisico) in
  `components/auth/RegistrationWizard` + `steps/*`; validazioni
  `utils/validators.js`; input condiviso `components/ui/Field`.
- Dati wizard -> "pending profile" (localStorage) -> scritti su `public.profiles`
  appena autenticato (`flushPendingProfile` in `AuthContext`), copre email,
  conferma-email e redirect Google. Anagrafica = colonne, fisico/futuri in
  `profiles.details` jsonb.
- Migrazione `supabase/migrations/20260709150000_profile_fields.sql` (ALTER
  profiles) DA ESEGUIRE. Google gia' configurato lato Simone (Cloud+Supabase).
- Rimossi `pages/Login.jsx`, `components/User.jsx` e la rotta `/login`
  (sostituiti dalla modale). Lint+build ok.

### 2026-07-09 - Claude (crop v2: stile app foto native)

- `ImageCropModal` rifatto: si apre subito dopo la selezione (niente conferma
  foto separata), zoom SOLO pinch (rimossi slider e label "Zoom").
- Immagine vincolata (react-easy-crop `restrictPosition` default + `minZoom=1`):
  copre sempre il riquadro, nessuna barra bianca durante l'editing.
- Riquadro ridimensionabile in larghezza 100%→50% via maniglie laterali custom
  che pilotano `aspect = EXERCISE_IMAGE_ASPECT * boxFrac` (area contenitore a
  43:16, quindi il riquadro resta a piena altezza e stringe in larghezza).
- `getCroppedImageDataUrl`: il ritaglio riempie l'altezza, larghezza
  proporzionale centrata; barre bianche SOLO nel render finale se boxFrac < 1.
  Niente upscale forzato.
- Rimossa la memoria pending `project_crop_v2_pending` (implementata). Nessun
  cambio di libreria. Lint+build ok.

### 2026-07-09 - Claude (crop immagini + placeholder ripristinato)

- Placeholder: rimosso il tile SVG bianco; torna l'icona bilanciere
  (IoBarbellOutline) quando `foto` e' null, sia in editor sia nella card.
  Rimossi `EXERCISE_PLACEHOLDER`/`resolveExerciseImage`.
- Aggiunto step di RITAGLIO tra selezione foto e salvataggio: nuovo
  `src/components/ImageCropModal.jsx` con `react-easy-crop` (pan + zoom,
  `restrictPosition=false`, minZoom 0.4). Condiviso da galleria e fotocamera
  via `ExerciseImageField` (che ora apre il crop invece di salvare subito).
- `utils/image.js`: `getCroppedImageDataUrl(src, croppedAreaPixels)` disegna il
  ritaglio in un canvas dell'area esercizio (688x256) su sfondo bianco; se la
  porzione e' piu' piccola dell'area resta il bianco (barre), NIENTE upscale
  forzato. Costanti area esportate. `readFileAsDataUrl` esportata.
- Nota: con pan/zoom + aspetto fisso, le barre da zoom-out sono uniformi (anche
  sopra/sotto), non solo laterali. Lint+build ok. Dipendenza: react-easy-crop.

### 2026-07-09 - Claude (immagini esercizi personalizzabili)

- Gestione immagini unificata per DB e manuali. Nuovo `src/utils/image.js`:
  `EXERCISE_PLACEHOLDER` (asset `src/assets/exercise-placeholder.svg`),
  `resolveExerciseImage(foto)` (foto o placeholder) e `fileToImageDataUrl(file)`
  (ridimensiona su canvas -> data URL JPEG leggera per localStorage).
- Nuovo componente `src/components/ExerciseImageField.jsx`: anteprima +
  "Cambia immagine" con due input file (galleria; fotocamera via
  `capture="environment"`). Usato nell'editor sia per esercizi da catalogo
  (foto = image_url) sia manuali (foto null -> placeholder). onChange aggiorna
  subito `form.foto`.
- `SchedaView`/`EsercizioCard` e l'editor ora usano `resolveExerciseImage`
  (niente piu' icona IoBarbellOutline come placeholder nella card).
- i18n: `esercizio.gallery` / `esercizio.camera` (5 lingue). Lint+build ok.

### 2026-07-09 - Claude (ricerca piu' stretta)

- La ricerca fuzzy con word_similarity era troppo permissiva (accettava refusi
  grossi e lasciava risultati non pertinenti su query lunghe).
- Migrazione `supabase/migrations/20260709140000_stricter_exercise_search.sql`
  (create or replace, stessa firma -> nessun cambio frontend): ora match per
  SOTTOSTRINGA (restringe progressivamente) + tolleranza refusi a distanza di
  edit <= 1, solo per testi >= 4 char e parola-per-parola. "pianca"->"panca"
  ok; "piuanca" -> niente. Distanza <=1 in SQL puro (funzione `lev_le_one`),
  niente estensioni: la prima stesura usava fuzzystrmatch ma il `create
  extension` bloccava l'esecuzione del file nel SQL Editor.

### 2026-07-09 - Claude (alias multilingua)

- Ricerca esercizi resa multilingua. Nuova tabella
  `public.catalog_exercise_i18n (exercise_id, locale, name)`: l'italiano resta
  in `catalog_exercises.name`, en/es/fr/zh stanno negli alias.
- Migrazione `supabase/migrations/20260709130000_exercise_i18n.sql`: crea la
  tabella + indici trigram + RLS select, e SOSTITUISCE la RPC con
  `search_catalog_exercises(search, p_locale, max_results)` che matcha su tutte
  le lingue (fuzzy) e ritorna il nome nella lingua richiesta (fallback it).
- Seed traduzioni: `supabase/seed_i18n.sql` (136 righe = 34 esercizi x 4 lingue),
  generato dal campo `names` aggiunto a `data/exercises.json`.
- `services/catalogs.searchCatalogExercises(query, { limit, locale })` passa
  `p_locale`; `EsercizioEditor` passa `lang` da `useLang()`.
- Restiamo a 34 esercizi + inserimento manuale (scelta prodotto Simone).

### 2026-07-09 - Claude (ricerca fuzzy)

- Aggiunta tolleranza ai refusi: migrazione
  `supabase/migrations/20260709120000_fuzzy_exercise_search.sql` (pg_trgm +
  indice trigram + funzione RPC `public.search_catalog_exercises(search,
  max_results)` che combina ilike e `word_similarity` > 0.3).
- `services/catalogs.searchCatalogExercises` ora chiama la RPC via
  `client.rpc(...)` invece di `.ilike`. Nomi/foto invariati per la UI.
- La RPC va eseguita nel SQL Editor come le altre. Soglia 0.3 tarabile.

### 2026-07-09 - Claude (autocomplete esercizi + foto)

- Seed rigenerato in ITALIANO con foto reali: `data/exercises.json` e
  `supabase/seed.sql` ora hanno nomi it (es. "Panca Piana con Bilanciere") e
  `image_url` dal dataset open-source free-exercise-db (raw.githubusercontent).
- `EsercizioEditor`: il campo Nome e' diventato autocomplete su
  `catalog_exercises` (debounce 250ms, min 2 caratteri). Al clic su un
  risultato compila `titolo` + `foto`; il box foto mostra l'immagine.
  Fallback: se `isSupabaseConfigured` e' false, resta input manuale.
- `SchedaView`/`EsercizioCard`: la miniatura mostra `ex.foto` se presente.
- i18n: aggiunte `esercizio.searching` / `esercizio.noResults` (5 lingue).
- Perche' funzioni serve `.env.local` + migrazioni 162000/170000 + seed.sql
  applicati su un Supabase reale (setup lato Simone).

### 2026-07-09 - Claude (seed catalogo)

- Scelta prodotto (Simone): il catalogo esercizi usato dall'app e' la tabella
  PIATTA `public.catalog_exercises` (quella che legge il frontend in
  `src/services/catalogs.js`), NON lo schema enterprise `catalog.exercises`
  (che invece popola `scripts/import-exercises.mjs`). Le due strade restano
  disconnesse: per ora si va su `public`.
- Creato `data/exercises.json`: catalogo seed di 34 esercizi (petto, schiena,
  gambe, spalle, braccia, core, cardio), nomi canonici in inglese come da
  principio "dato importato = valore originale inglese".
- Creato `supabase/seed.sql`: copia lo stesso JSON dentro
  `public.catalog_exercises` via `jsonb_array_elements`, idempotente
  (upsert su `unique (source, source_id)`), incollabile nel SQL Editor.
- DB "creato come stabilito" = schema `public` delle migrazioni 162000 + 170000.
  Non applicato da me su un Supabase reale (manca `.env.local`/credenziali):
  runbook lasciato a Simone. Migrazione enterprise 173000 opzionale per questa
  strada.

### 2026-07-09 - Claude

- Ristrutturata questa cartella come FONTE DI VERITA' unica condivisa.
- `AI_MEMORY.md` trasformato da log a punto d'ingresso: ordine di lettura +
  stato riconciliato (runtime localStorage vs backend Supabase scaffolded).
- Aggiunto `docs/frontend.md`: mappa dell'app frontend attuale, cosi' Codex
  ha visibilita' sul lato che finora viveva solo nella memoria privata di
  Claude.
- Corretta la contraddizione "nessun backend" nella memoria di Claude: ora
  rimanda a questi doc.

### 2026-07-08 - Codex

#### Database

- Scelta iniziale: Supabase/Postgres.
- Migrazione creata: `supabase/migrations/20260708162000_initial_schema.sql`.
- Seconda migrazione cataloghi creata: `supabase/migrations/20260708170000_catalogs_and_nutrition.sql`.
- Migrazione enterprise foundation creata: `supabase/migrations/20260708173000_enterprise_foundation.sql`.
  - Crea schemi `catalog`, `app`, `private`.
  - Introduce catalogo esercizi normalizzato.
  - Introduce workout/log/goals/measurements/nutrition in schema `app`.
  - Introduce bucket Supabase Storage `exercise-media`.
  - Non rimuove le vecchie tabelle `public`, per non rompere il frontend attuale.
- Documento schema creato: `docs/database.md`.
- Tabelle principali: `profiles`, `user_settings`, `user_goals`, `ring_settings`,
  `workout_days`, `workout_cards`, `exercises`.
- Precisazione prodotto:
  - Catalogo globale esercizi palestra importato da API esterna.
  - Catalogo globale alimentazione importato da API esterna.
  - I cataloghi API NON sono dati personali: tabelle globali leggibili dall'app.
  - Allenamenti, schede, stati, obiettivi, preferenze e diario alimentare
    restano dati per-utente.
- API esercizi candidata: ExerciseDB su RapidAPI (`exercisedb.p.rapidapi.com`,
  header `X-RapidAPI-Key`/`X-RapidAPI-Host`). I dati vanno copiati nel catalogo
  globale `catalog_exercises`, non chiamati dal client. La chiave RapidAPI non
  deve stare nel frontend.
- RLS abilitata su tutte le tabelle applicative.
- Trigger `auth.users -> profiles/user_settings` incluso nella migrazione.

#### Frontend Supabase

- Dipendenza installata: `@supabase/supabase-js`.
- Client creato: `src/lib/supabaseClient.js`.
- Variabili documentate in `.env.example`: `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`.
- Servizio palestra `src/services/workouts.js`: `fetchWorkoutDays()`,
  `replaceWorkoutDays(userId, giornate)`.
- Servizio cataloghi `src/services/catalogs.js`: `searchCatalogExercises(query)`,
  `searchFoodItems(query)`, `getFoodItemByBarcode(barcode)`.
- Script importer `scripts/import-exercises.mjs`
  (`npm run import:exercises -- --json data/exercises.json --images-dir data/exercises`,
  supporta `--dry-run`/`--skip-images`, usa service role key, richiede
  `exercises.json` e immagini non ancora presenti).

#### Auth

- Aggiunti `src/context/AuthContext.jsx` e `src/components/AuthShell.jsx`.
- `src/main.jsx` include `AuthProvider`.
- `Login.jsx` usa `supabase.auth.signInWithPassword`; `Registrazione.jsx` usa
  `supabase.auth.signUp`; `Profilo.jsx` mostra sessione + logout;
  `User.jsx` porta a `/profilo`.

#### Verifica

- `npm run lint` e `npm run build` passati. Nota: Vite segnala chunk JS > 500 kB
  dopo Supabase; non blocca la build.

#### Note operative

- Struttura documentale creata: `architecture.md`, `database.md`, `api.md`,
  `roadmap.md`, `decisions.md`.
- Prossimo passo consigliato: applicare le migrazioni su Supabase, poi decidere
  quali API usare per catalogo esercizi e alimenti; poi popolare
  `catalog_exercises`/`food_items`; poi collegare la pagina Palestra al DB.
- Gli schemi `catalog`/`app`/`private` vanno esposti nelle API settings Supabase
  o l'importer passa a connessione Postgres diretta.
