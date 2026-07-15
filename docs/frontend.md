# Frontend (app runtime attuale)

Come e' fatta l'app che gira OGGI. Sorgente dati runtime: `localStorage` (il
backend Supabase e' predisposto ma non ancora collegato, vedi `AI_MEMORY.md`).
Mobile-first: colonna centrata `max-w-[390px]`.

## Stack

React 19 + Vite. Tailwind CSS v4 (`@tailwindcss/vite`). react-router-dom v7.
react-icons. `@dnd-kit` (core/sortable/utilities) per drag&drop touch nel
riordino esercizi. i18n custom (5 lingue). Tema dark/light + accento.

## Providers (`src/main.jsx`)

`BrowserRouter > LanguageProvider > ThemeProvider > AuthProvider > TimerProvider > App`

`TimerProvider` e' OBBLIGATORIO: `TimerPill` sta nel `Layout` (ogni pagina) e
chiama `useTimer()`; senza provider crasha l'intero albero (schermo vuoto).

## Routing (`src/App.jsx`)

`<Layout>` = `<Outlet/>` + `<TimerPill/>` + `<Footer/>`.
Rotte dentro Layout: `/` Home, `/palestra`, `/alimentazione`, `/timer`,
`/profilo`, `/impostazioni` (+ `/colori`, `/obiettivi`, `/lingua`, `/backup`), e catch-all
`*` -> `NotFound` (dentro Layout, mantiene TopBar/Footer).
Fuori Layout: `/registrazione` (wizard). `BrowserRouter` sta in `main.jsx`.
Il login e' una MODALE aperta dall'icona utente in alto a destra (non piu' una
rotta `/login`).

## Auth e registrazione

- Icona in alto a destra = `components/auth/UserMenu`: se non loggato apre
  `LoginModal` (email/password + provider OAuth via `ProviderButtons`); se loggato
  apre un menu (Profilo/Impostazioni/Esci), predisposto a nuove voci.
- Provider OAuth elencati in `lib/authProviders.js` (oggi Google). Aggiungerne =
  una voce li'. Servizi auth in `services/auth.js` (email + OAuth + signOut).
- Registrazione = wizard 3 step (`components/auth/RegistrationWizard` +
  `steps/StepMethod|StepAnagrafica|StepFisico`), stato unico (indietro non perde i
  dati), validazioni in `utils/validators.js`, input condiviso `components/ui/Field`.
- I dati del wizard si salvano "in sospeso" (`services/profile`) e vengono scritti
  su `public.profiles` appena l'utente e' autenticato (email/redirect Google),
  tramite `flushPendingProfile` chiamato in `AuthContext`. Anagrafica = colonne
  tipizzate; fisico/futuri in `profiles.details` (jsonb).

## Modello dati in localStorage

Questa e' la struttura che, alla Fase 5 della roadmap, migrera' su Supabase.

- `fitpulse-giornate`: array GIORNATE reali, sorgente unica dell'albero
  Palestra. Giornata = `{ id, schede:[], stato?, day?, nome?, custom? }`.
  Ha `day` (giorno settimana) OPPURE `nome` (libero: "Scheda A" o
  personalizzato). `custom:true` solo se creata via "Nome personalizzato".
  `stato` = `done`/`skip` (dallo swipe).
  - Scheda = `{ id, nome, esercizi:[], custom? }`.
  - Esercizio = `{ id, titolo, serie, reps, kg, foto, stato?, split?, sets? }`
    (serie 1-5. Con `split:true` ogni serie ha la sua riga reps/kg in
    `sets:[{reps,kg}]`; `reps`/`kg` rispecchiano la 1ª serie per card/cloud.
    Helper in `data/exerciseSets.js`. UI: select custom con radio "split" e righe
    centrate — `EsercizioEditor`. Cloud: colonne `is_split`/`set_details` su
    `public.exercises`, migrazione 20260713170000)
    (serie/reps/kg come stringhe; `foto` = URL catalogo, oppure data URL di una
    foto scelta dall'utente da galleria/fotocamera, oppure null = placeholder
    icona bilanciere). Immagini in `utils/image.js` (`readFileAsDataUrl`,
    `getCroppedImageDataUrl`, costanti area) + `ExerciseImageField` +
    `ImageCropModal` (react-easy-crop). Flusso: selezione → si apre subito il
    ritaglio → salva. Nel crop l'immagine copre sempre il riquadro (nessuna
    barra bianca), zoom solo pinch (niente slider), riquadro ridimensionabile
    in larghezza 100%→50% con maniglie laterali. Il letterbox bianco si aggiunge
    solo nel render finale se il riquadro era piu' stretto dell'area.
  - Giornata `custom` = unico allenamento: nasce con una scheda implicita
    (`schede[0]`) e si apre direttamente in vista esercizi.
- `fitpulse-open-giornata` / `fitpulse-open-scheda`: id aperti (restare sul
  dettaglio al refresh).
- `fitpulse-weekly-goal`: numero allenamenti/settimana obiettivo (default 4).
- `fitpulse-goals`: `{ daily, weekly, monthly:[] }` obiettivi Home.
- `fitpulse-ring-config`: colori anelli.
- `fitpulse-theme` / `fitpulse-custom-theme` / `fitpulse-navbar` /
  `fitpulse-body-bg`: tema e colori.
- `fitpulse-lang`: lingua attiva.
- `fitpulse-timer` / `fitpulse-rest-duration`: stato timer di recupero.
- `fitpulse-giornate-owner`: userId Supabase proprietario dei dati giornate
  locali (o assente = dati anonimi). Usato dal ponte cloud per non spingere i
  dati di un utente nel DB di un altro sullo stesso browser (vedi sotto).
- `fitpulse-diario`: diario alimentare `{ "YYYY-MM-DD": { breakfast:[], lunch:[],
  dinner:[], snacks:[] } }`. Alimento = `{ id, nome, grammi, kcal, protein,
  carbs, fat, sugars, fiber }` (numeri come stringhe). I 5 macro sono in `MACROS`
  (`data/nutritionDefaults.js`), iterati da editor/obiettivi/barre. Grassi = valore
  unico (no saturi/insaturi). Aggregazioni per periodo: `weekDateKeys`/`monthDateKeys`/
  `rangeTotals`/`dailyKcalSeries`/`weekOfMonth`/`clippedWeek`. Riepilogo Alimentazione
  con tab giorno/settimana/mese: cambio tab TORNA a oggi (reset `selDate`); la
  navigazione periodo è DENTRO la scheda (frecce ancorate all'anello/grafico —
  aprendo gli accordion non si muovono — + swipe orizzontale; la freccia si
  illumina in accento ~380ms su click/swipe) con transizione direzionale/fade del
  contenuto (`.nut-in-*`/`.nut-fade`). Accordion: uno "Macro-nutrienti" in
  giorno/settimana, mentre in mese ce n'è UNO PER SETTIMANA (`monthWeeks`,
  `MacroAccordion`) ad apertura SINGOLA (aprendone uno si chiude l'altro; titolo
  "Nª settimana" + range "dal X al Y" più piccolo). Il grafico mensile
  (`NutritionTrendChart`) mostra il DEFICIT kcal giornaliero (`dailyDeficitSeries`:
  obiettivo−consumato, 0 nei giorni senza dati) con baseline a zero e andamento
  fluttuante (deficit sopra / surplus sotto); le etichette agli estremi indicano il
  GIORNO del deficit/surplus massimo ("deficit max gg: n"). Doppio tap/click apre
  `NutritionDeficitDetail` (piano cartesiano ingrandito: X = giorni del mese, Y con
  "Deficit kcal"/"Surplus kcal" verticali, zero al centro). La modifica obiettivi è per ora
  NASCOSTA (rimosso il trigger; `NutritionGoalsEditor` resta, andrà in Impostazioni).
  Intestazione = indicatore piccolo sopra + valore sotto: Oggi/data, "Nª settimana ·
  mese"/"dal X al Y", Corrente/mese. Le settimane sono RITAGLIATE al mese (non
  sconfinano: es. 28→30, poi 1→…) e la numerazione riparte ogni mese. Mese = grafico
  `NutritionTrendChart`.
- `fitpulse-nutrition-goals`: obiettivi giornalieri `{ kcal, protein, carbs, fat }`.
- Legacy: `fitpulse-schede` (vecchie schede sciolte) viene migrato una-tantum
  in una giornata di default da `loadGiornate`.

## Gerarchia Palestra (pagine interne, non rotte)

`Palestra` (GIORNATE) -> `GiornataView` (SCHEDE) -> `SchedaView` (ESERCIZI).
Ogni livello e' una pagina interna (early-return): il figlio riceve dati via
prop e risale le modifiche con callback. `Palestra` e' l'unico che scrive su
`localStorage` (`saveGiornate`). Le giornate `custom` saltano `GiornataView` e
si aprono direttamente in `SchedaView`. Le card giornata (`GiornataCard`) si
possono marcare `done`/`skip` con swipe orizzontale.

## Sync cloud allenamenti (Fase 5, parziale)

Ponte **local-first + mirror** per le GIORNATE, in `hooks/useWorkoutSync.js`
(usato da `Palestra`). `localStorage` resta il motore (l'app va offline e da non
loggati come prima). Da loggato:
1. **riconciliazione** una-tantum al login: se il DB ha giornate le scarica nel
   locale; se il DB e' vuoto e il locale e' anonimo (o gia' dello stesso utente)
   lo carica su; se il locale e' di un altro utente parte pulito;
2. **mirror** a ogni modifica (debounce ~800ms) via
   `services/workouts.replaceWorkoutDays(userId, giornate)` (full-replace).

No-op se Supabase non e' configurato.

## Sync cloud diario Alimentazione (Fase 5/6, parziale)

Stesso ponte **local-first + mirror** del workout, in `hooks/useNutritionSync.js`
(usato da `Alimentazione`), che consuma le tabelle gia' esistenti
`public.meal_logs` + `public.meal_entries` via `services/nutrition.js`
(`fetchDiary` / `replaceDiary(userId, diario)`, full-replace). Riconciliazione al
login + mirror con debounce, marcatore `fitpulse-diario-owner` come per le
giornate. Mapping pasti: il frontend usa `snacks` (plurale), il DB `snack`.
Gli **obiettivi nutrizionali** (`fitpulse-nutrition-goals`) sono ora sincronizzati
dallo stesso hook: tabella `public.nutrition_goals` (migrazione
20260713160000, una riga per utente) via `fetchGoals` / `upsertGoals`. Lo stesso
marcatore `fitpulse-diario-owner` governa anche gli obiettivi (niente eredita' fra
utenti sullo stesso browser). Da verificare end-to-end su un Supabase reale.

## Pagine (`src/pages/`)

- `Home`: 3 anelli progresso + tab obiettivi (giorno/settimana/mese).
- `Palestra`: lista giornate (Lun->Dom + custom), filtro segmented
  Tutte/Settimanale/Scheda, creazione giornata (giorno / "Scheda A" / nome
  personalizzato), Copia/Sposta per le custom, Progresso settimanale (3 barre
  da stati `done`/`skip` + weekly goal).
- `Timer`: recupero countdown->countup, colori verde/rosso/giallo.
- `Impostazioni` + `ImpostazioniColori`/`Obiettivi`/`Lingua`/`Backup`
  (export/import di tutte le chiavi `fitpulse-*` in un file JSON, via
  `utils/backup.js`; l'import sostituisce i dati e ricarica l'app).
- `Alimentazione`: diario alimentare giornaliero. Selettore data (frecce
  giorno prec./succ., pill "Oggi"), riepilogo (anello kcal via `RingChart` +
  3 barre macro P/C/G vs obiettivi), 4 sezioni pasto
  (colazione/pranzo/cena/spuntini) con inserimento manuale alimenti
  (`FoodEditor`), elimina con `ConfirmModal`, obiettivi giornalieri modificabili
  (`NutritionGoalsEditor`). Solo `localStorage` per ora (nessun mirror cloud).
- `Peso`: registro del peso corporeo local-first (`/peso`, linkata da `Profilo`).
  Riepilogo (peso attuale + variazione), grafico di andamento a linea singola
  (`WeightChart`, SVG inline in accento), aggiunta/modifica misura (`WeightEditor`:
  data + kg) ed eliminazione con `ConfirmModal`. Dati in `data/weightDefaults.js`
  (chiave localStorage `fitpulse-weight`, voce `{ id, date, kg }`, upsert per data).
- `Login`/`Registrazione`/`Profilo`: collegati a Supabase Auth (backend).
- `NotFound`: 404.

## Componenti chiave (`src/components/`)

`Layout`, `TopBar` (full-bleed, a dx LanguagePicker+ThemePicker+User), `Footer`
(bottom-nav 5 voci), `RingChart`/`GoalCard`, `ThemePicker`/`LanguagePicker`,
`User`. Timer: `TimerWheel` (wheel picker), `RestPicker`, `TimerPill`.
Palestra: `GiornataView`, `SchedaView`, `GiornataCard`, `EsercizioCard`
(MODALITÀ MODIFICA stile iPhone: pressione prolungata ~400ms (`hooks/useLongPress`)
→ tutte le card tremano (`.jiggle`) e mostrano i pulsanti elimina (X rossa, alto sx)
e modifica (matita blu, alto dx) a cavallo del bordo; richiamano le stesse azioni di
prima. Lo stato `editMode` sta in `SchedaView`. USCITA: click su modifica (apre
l'editor) oppure tocco fuori dalle card (listener su `[data-ex-card]`). La X apre
invece una conferma (`ConfirmModal`, `confirm.deleteEsercizio`) e NON fa uscire dalla
modalità, né confermando né annullando (il listener è disattivo mentre è aperta).
Restano doppio/triplo tap stati + riordino via maniglia @dnd-kit.
LAYOUT card: titolo in contenitore dedicato (elemento testuale principale) e sotto le
info serie (`ExerciseInfo`): split OFF = una riga "Serie 3 • Rip 8 • 30 kg" centrata
verticalmente; split ON = una riga per serie con solo rip/peso (righe da `editorRows`,
sempre sincronizzate con la select). Immagine e maniglia invariate.
Header scheda: accanto al titolo i pulsanti Play (verde, success) e Organizza (blu,
primary, icona custom `ui/ReorderIcon`) — per ora SOLO grafica, nessuna azione),
`EsercizioEditor` (modale, tutti i campi obbligatori; il campo Nome ha
autocomplete sul catalogo `public.catalog_exercises` via
`services/catalogs.searchCatalogExercises`, che chiama la RPC
`search_catalog_exercises(search, p_locale, max_results)`: ricerca fuzzy e
multilingua — matcha su it/en/es/fr/zh (alias in `catalog_exercise_i18n`) e
mostra il nome nella lingua attiva. Scegliendo un risultato compila
`titolo` + `foto`. Se Supabase non e' configurato resta input manuale).
Modali riusabili:
`ConfirmModal`, `PromptModal`, `GiornataPickerModal`. Auth: `AuthShell`.
Alimentazione: `FoodEditor` (aggiungi/modifica alimento, riusa `ui/Field`),
`NutritionGoalsEditor` (obiettivi giornalieri).

## Theming e i18n

- Tema: token semantici CSS in `src/index.css` (`:root` default scuro +
  override `:root[data-theme="light"]`); `data-theme` deciso dalla luminosita'
  di `--body-bg`. In JSX i colori usano arbitrary values Tailwind
  (`bg-[var(--surface)]`, `text-[color:var(--text)]`). Gestione in
  `ThemeContext` + `src/themes.js` (5 preset, `isLightColor`).
- i18n: `src/i18n/translations.js` + `LanguageContext`. Chiavi piatte
  namespaced, parita' chiavi obbligatoria tra lingue (it/en/es/fr/zh). TUTTI i
  testi UI passano da `t()`. I dati modificabili portano una `*Key` tradotta;
  se l'utente modifica il testo, la `*Key` viene rimossa e resta testo libero.

## Convenzioni / verifica

- Componente separato solo se riusato o il file diventa illeggibile.
- Titoli scrivibili dall'utente in Title Case (helper in `src/utils/text.js`).
- Verifica prima di dire "fatto": `npx eslint src` (0 errori) + `npx vite build`.
