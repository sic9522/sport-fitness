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
  (giornate>schede>esercizi, swipe/riordino/stati), Alimentazione (diario
  giornaliero: pasti, alimenti manuali, macro vs obiettivi), Timer di recupero,
  Impostazioni (colori/obiettivi/lingua), i18n 5 lingue, tema dark/light.
  Dettagli in `frontend.md`.
- BACKEND SCAFFOLDED (predisposto, NON ancora collegato alla UI): Supabase
  client, `AuthContext`/`AuthShell`, pagine Login/Registrazione/Profilo su
  Supabase Auth, migrazioni SQL, servizi (`workouts`, `catalogs`), importer
  esercizi. Dettagli in `database.md`/`api.md`.

Il ponte tra i due (migrazione `localStorage` -> Supabase) e' la Fase 5 della
roadmap. **Avviato il 2026-07-13 per gli ALLENAMENTI** (mirror local-first in
`useWorkoutSync`, vedi Log + `frontend.md`); il resto (alimentazione, obiettivi,
impostazioni) e' ancora solo `localStorage`. La sorgente dati runtime resta
`localStorage` come motore anche dove il mirror e' attivo.

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

### 2026-07-13 - Claude (Palestra: limiti editor, header scheda, recupero per-scheda)

- **Limiti input nell'`EsercizioEditor`**: Nome max 40 + contatore live "n/40" accanto
  all'etichetta; Rip solo cifre, max 2 (la 3ª NON entra); kg max 4 cifre + un
  separatore (`,`→`.`). Oltre il limite: campo rosso + messaggio in OVERLAY sopra il
  campo (`absolute bottom-full`, niente shift del layout), che sparisce dopo 3s, al
  blur o toccando altrove (un solo `fieldError` per volta). Il separatore senza cifre
  non si salva (`cleanKg`: "12."→"12") e la card mostra il peso senza zeri superflui
  (`formatKg`: "0.50"→"0.5"). Nuove chiavi `esercizio.repsMax`/`kgMax`.
- **Nome scheda**: si sceglie ORA alla creazione (`PromptModal` riusato in
  `GiornataView`, chiavi i18n già esistenti); dentro la scheda è in SOLA LETTURA.
  Rimossi da `SchedaView` l'input, `nameError`/`nameRef` e il controllo "Nome
  obbligatorio" sul "+" (diventato irraggiungibile e senza input sarebbe stato un
  vicolo cieco); rimosso `renameScheda` da `GiornataView` (codice morto). Il rename
  tornerà da un'altra sezione (scelta di Simone).
- **Header scheda**: Play/recupero/"+" stessa altezza (`HEADER_BTN` `h-9`), Play e
  recupero stessa larghezza (`w-20`), titolo grande solo quanto il contenuto,
  distribuzione uniforme con `justify-between`. Pulsante **Organizza rimosso**
  dall'UI (`ui/ReorderIcon` conservato).
- **Recupero PER SCHEDA**: il badge è un `RestPicker` funzionante che imposta
  `scheda.rest` (indipendente per scheda; fallback al recupero globale finché non
  impostato). `RestPicker` esteso con props OPZIONALI `value`/`onChange`/`className`:
  senza props resta il globale → **Palestra invariata**. Timer globale/navbar NON
  toccati (Simone li rimuoverà più avanti, per evitare conflitti ora).
  ⚠️ `scheda.rest` NON è mappato sul cloud (manca la colonna su `workout_cards`).
- **TimerWheel**: scrollbar sottile custom (`.thin-scrollbar`, tema-aware) al posto di
  `no-scrollbar` → su desktop si raggiungono i valori fuori vista; righe cliccabili
  (`<button>`): il click scorre, seleziona, salva e chiude via nuova prop `onPick`
  (lo scroll da solo non chiude). Vale anche per il picker in Palestra.
- **Card esercizio** (misure finali tarate a vista): `h-[120px]`, `p-2`, immagine
  74px, maniglia 30px, gap fra card 18px, contenitori 45%/55%.
- ✅ lint + test + build + parità i18n ok.

### 2026-07-13 - Claude (Palestra: header scheda + restyling card esercizio)

- **Solo grafica**, nessuna logica toccata. Header scheda: due pulsanti accanto al
  titolo (prima del badge recupero) — **Play** (verde `#22c55e`, success) e
  **Organizza** (blu `#3b82f6`, primary, icona custom `components/ui/ReorderIcon.jsx`:
  numeri 1/2/3 a sinistra + linee a destra, l'1 alzato = elemento in spostamento).
  Entrambi SENZA funzionalità per ora (solo aria-label + nuove chiavi i18n
  `palestra.play`/`palestra.organize`).
- **Scelta (confermata da Simone)**: niente componente Button con varianti (in `ui/`
  c'era solo `Field`); si riusano i colori già presenti. "primary" = blu, non accento.
- **Card esercizio**: titolo in contenitore dedicato; info serie estratte in
  `ExerciseInfoLine` (split OFF) / `ExerciseSetRows` (split ON), righe da `editorRows()`
  (riuso, nessuna duplicazione della logica split). Immagine e maniglia invariate.
- **Rifinitura layout (subito dopo, confermata da Simone)**: header con
  `justify-between` e campo nome largo quanto il testo (`size`) → titolo/Play/
  Organizza/badge/"+" equidistanti (prima il nome era `flex-1` e ammassava i pulsanti
  a destra). Card esercizio (misure tarate a vista con Simone): altezza fissa
  **120px**, `p-2`, immagine **74px**, maniglia **30px**, gap fra card **18px**.
  Struttura UNICA in entrambe le modalità: contenitore 1 **~45%** (`basis-[45%]`,
  titolo che va a capo, niente `truncate`) + contenitore 2 **~55%** (`basis-[55%]`,
  dati centrati verticalmente). Cambia SOLO il contenuto del secondo:
  Split OFF = "Serie 3" + "Rip. 8 - 30 kg" (`ExerciseInfoLine`);
  Split ON = una riga "Rip. 8 - 30 kg" per serie (`ExerciseSetRows`, da `editorRows`).
  Separatore spazio-trattino-spazio fra rip e kg.
- ✅ lint + test + build + parità i18n ok.

### 2026-07-13 - Claude (Palestra: swipe → modalità modifica stile iPhone)

- **Swipe RIMOSSO** dalle card esercizio (sinistra/destra + animazioni e logica
  collegata: DETENT/RESIST/confirmPx/translateX/sfondo azione). Le funzioni di
  elimina/modifica NON sono state riscritte: sono richiamate dai nuovi pulsanti.
- **Modalità modifica**: pressione prolungata ~400ms su una card → TUTTE le card
  entrano in modalità e tremano (riusata la classe `.jiggle` già in `index.css`,
  finora non collegata). Nuovo hook riusabile `hooks/useLongPress.js` (solo il
  timer; la geometria del gesto resta nella card). Stato `editMode` in `SchedaView`
  (proprietario della lista) → estendibile a future azioni.
- **Pulsanti**: X bianca su cerchio rosso in alto a SINISTRA (elimina), matita
  bianca su cerchio blu in alto a DESTRA (modifica); sporgono ~50% del diametro
  dal bordo (`-top-3/-left-3/-right-3`, rimosso `overflow-hidden` dal wrapper).
- Invariati (non correlati): doppio/triplo tap stati done/skip, riordino a maniglia.
- **Uscita dalla modalità** (aggiunta subito dopo): click su MODIFICA (apre l'editor
  ed esce) o tocco FUORI dalle card (listener document su `[data-ex-card]`). La X
  apre una conferma (`ConfirmModal` + nuova chiave `confirm.deleteEsercizio`, stesso
  pattern di `GiornataView`) e NON esce dalla modalità né su Elimina né su Annulla:
  il listener "tocco fuori" è disattivato mentre la conferma è aperta.
- ✅ lint + test + build + parità i18n ok.

### 2026-07-13 - Claude (Alimentazione: rifiniture tab/data/grassi)

- **Grassi unico**: rimossi saturi/insaturi, torna `fat` singolo (macro totali = 5:
  protein, carbs, fat, sugars, fiber). Migrazione `nutrition_macros` ridotta (solo
  `sugars_g`/`fiber_g` sugli obiettivi; il diario usa `fat_g`/`sugar_g`/`fiber_g`).
- **Intestazione data per tab**: Giornaliero = data odierna (+ "Oggi"); Settimanale
  = "dal X al Y" + "Settimana N" (`weekOfMonth`); Mensile = mese corrente. Le frecce
  navigano per periodo (giorno/settimana/mese).
- **Accordion Macro-nutrienti** si chiude automaticamente al cambio tab.
- ✅ lint + test + build + parità ok.

### 2026-07-13 - Claude (Alimentazione: tab periodo + macro estesi)

- **Riepilogo a tab** (come Home): Giornaliero / Settimanale (anello kcal + barre
  vs obiettivo×giorni) / Mensile (grafico `NutritionTrendChart` kcal/giorno +
  linea obiettivo). Aggregazioni pure in `nutritionDefaults`
  (`weekDateKeys`/`monthDateKeys`/`rangeTotals`/`dailyKcalSeries`).
- **Macro estesi**: da P/C/G a 6 macro in `MACROS` (protein, carbs, satFat,
  unsatFat, sugars, fiber). `sumNutrients`/DEFAULT_GOALS/FoodEditor/
  NutritionGoalsEditor iterano la config. Barre nell'**accordion "Macro-nutrienti"**.
- **Cloud**: `nutrition.js` mappa i nuovi campi; migrazione
  `20260713180000_nutrition_macros.sql` (colonne sat/unsat su meal_entries +
  obiettivi su nutrition_goals; zuccheri/fibre usano sugar_g/fiber_g esistenti) DA APPLICARE.
- i18n `nutrition.*` (macro corti, macros, monthlyTrend) nelle 5 lingue. Tab =
  chiavi `period.*` esistenti. ✅ lint + test + build + parità ok.

### 2026-07-13 - Claude (serie con split per-serie in Palestra)

- **Serie come select 1-5 + "split"**: nell'`EsercizioEditor` la serie è una
  select custom (non nativa: il menu contiene in alto a destra un radio "split").
  Split OFF = una riga reps/kg condivisa (come prima). Split ON = N righe, una per
  serie, indipendenti (piramidale). La select è centrata verticalmente rispetto
  alle righe (flex `items-center`: 2→tra le righe, 3→riga centrale, ecc.).
- **Modello** `data/exerciseSets.js` (helper puri + test): esercizio ora
  `{..., serie, reps, kg, split?, sets?:[{reps,kg}]}`, retro-compatibile
  (`reps`/`kg` = 1ª serie). Card invariata (usa reps/kg = prima serie).
- **Cloud**: `workouts.js` mappa `is_split`/`set_details`; migrazione
  `20260713170000_exercise_sets.sql` (ALTER `public.exercises`) DA APPLICARE.
- i18n `esercizio.split` nelle 5 lingue. ✅ lint + test + build + parità i18n ok.

### 2026-07-13 - Claude (misure corporee — sezione NASCOSTA)

- **Nuova sezione Misure corporee** (composizione + circonferenze: massa
  magra/grassa, % grasso, massa muscolare, % acqua, girovita, fianchi, petto,
  braccio, coscia, polpaccio, collo). Predisposta ma **NON ancora visibile**:
  scelta prodotto di Simone (i dati vanno inseriti a mano e serviranno a gestire
  peso/palestra/alimentazione). `pages/MisureCorporee.jsx` +
  `components/BodyMeasuresEditor.jsx` + `data/bodyMeasuresDefaults.js` (chiave
  `fitpulse-body-measures`, snapshot `{ id, date, values }`, upsert per data,
  `latestValues` = valore più recente per campo). Campi in `MEASURE_FIELDS`
  (aggiungerne uno = una riga lì + chiave `body.field.*`).
- **Nascondiglio**: `config/features.js` (`FEATURES.bodyMeasures = false`). La
  rotta `/misure` esiste (raggiungibile solo via URL), ma il link in `Profilo` è
  dietro il flag. Per RENDERLA VISIBILE: mettere il flag a `true`.
- i18n `body.*` in tutte e 5 le lingue. Test su `bodyMeasuresDefaults`.
- ✅ **Verificato**: `npm run lint` + `npm run test` + `npm run build` ok, parità i18n.

### 2026-07-13 - Claude (peso corporeo + grafico andamento)

- **Nuova feature Peso corporeo** (local-first, `/peso`, linkata da `Profilo`):
  `pages/Peso.jsx` + `data/weightDefaults.js` (chiave `fitpulse-weight`, voci
  `{ id, date, kg }`, upsert per data). Riepilogo peso attuale + variazione,
  grafico di andamento a linea singola `components/WeightChart.jsx` (SVG inline in
  accento, assi recessivi, serie singola → niente legenda, lista voci = table
  view), editor `WeightEditor.jsx` (data + kg, validati). i18n `weight.*` +
  `profilo.weightCard*` nelle 5 lingue. Test su `weightDefaults`.
- Solo localStorage (nessun mirror cloud): tabella/sync futuri se serviranno.
- ✅ **Verificato**: `npm run lint` + `npm run test` + `npm run build` ok, parità i18n.

### 2026-07-13 - Claude (offline PWA + CI + backup dati + più test)

- **Service worker / offline**: aggiunto `vite-plugin-pwa` (`registerType
  autoUpdate`, `injectRegister auto`, `manifest:false` = usa il
  `public/manifest.webmanifest` esistente). Precache Workbox degli asset di build:
  l'app installata funziona offline e si auto-aggiorna. Disabilitato in dev.
- **CI GitHub Actions**: `.github/workflows/ci.yml` — su push/PR a `main` esegue
  `npm ci` + lint + test + build (Node 24).
- **Backup dati**: nuova pagina `Impostazioni → Backup` (`/impostazioni/backup`,
  `pages/ImpostazioniBackup.jsx`) + `utils/backup.js` (`buildBackup`/`applyBackup`/
  `isValidBackup`, storage iniettabile). Esporta tutte le chiavi `fitpulse-*` in un
  JSON e le reimporta (con conferma, poi reload). i18n `backup.*`/`settings.backup.*`
  in tutte e 5 le lingue.
- **Più test**: aggiunti `giornateDefaults`, `validators`, `backup` → totale
  Vitest ora 40+ test.
- ✅ **Verificato**: `npm run lint` + `npm run test` + `npm run build` ok, parità
  i18n mantenuta.

### 2026-07-13 - Claude (icone PWA + test + obiettivi nutrizione sync)

- **Icone PWA PNG**: `scripts/generate-icons.mjs` (`npm run icons`, usa
  `@resvg/resvg-js`) genera `public/icon-192/512`, `icon-maskable-512`,
  `apple-touch-icon` (180) da una versione pulita del logo (accento + bolt bianco,
  niente filtri blur). `manifest.webmanifest` + `apple-touch-icon` in `index.html`
  aggiornati. Ora install-prompt "pieno" e icona home iOS/Android.
- **Test unitari**: aggiunto Vitest (`npm run test`). 13 test sulle funzioni pure
  (`nutritionDefaults`: sumNutrients/dayTotals/dateKey/diarioHasData/dayMeals;
  `utils/text`: titleCase). Env node, nessun jsdom (solo funzioni pure).
- **Obiettivi nutrizionali → cloud**: nuova migrazione
  `20260713160000_nutrition_goals.sql` (tabella `public.nutrition_goals`, 1 riga/
  utente, RLS own). `services/nutrition` + `fetchGoals`/`upsertGoals`;
  `useNutritionSync` esteso a `(diario, setDiario, goals, setGoals)`: riconcilia e
  rispecchia anche gli obiettivi, stesso marcatore `fitpulse-diario-owner`. Con
  questo il diario alimentare e' completamente sincronizzabile (diario + obiettivi).
- ✅ **Verificato**: `npm run lint` + `npm run test` + `npm run build` ok.
- ⚠️ La migrazione `nutrition_goals` va APPLICATA su Supabase come le altre.

### 2026-07-13 - Claude (ErrorBoundary + parità i18n)

- **ErrorBoundary globale**: nuovo `components/ErrorBoundary.jsx` (class
  component), wrappa TUTTO l'albero in `main.jsx` (fuori dai provider). Un errore
  di render ora mostra un fallback tematizzato con pulsante Ricarica invece dello
  schermo bianco. Messaggi nelle 5 lingue letti da `localStorage` (`fitpulse-lang`,
  fallback it) perche' non puo' usare `useLang()`.
- **Parità i18n verificata**: 220 chiavi × 5 lingue, nessuna mancante né vuota.
  Nessun fix necessario (solo controllo).
- ✅ **Verificato**: `npm run lint` + `npm run build` ok.

### 2026-07-13 - Claude (PWA + code-splitting)

- **PWA / installabilita'**: aggiunto `public/manifest.webmanifest` (nome, tema
  `#863bff`, display standalone, icona `favicon.svg`) + meta nell'`index.html`
  (`description`, `theme-color`, tag `apple-mobile-web-app-*`). NB: icona solo
  SVG; per l'install prompt "pieno" di Chrome servirebbero PNG 192/512 (futuro).
- **Code-splitting per rotta** (roadmap Fase 7 "lazy loading"): le pagine in
  `App.jsx` passano a `React.lazy` + `Suspense`. Doppio boundary: uno esterno in
  `App` (copre `/registrazione` e primo load), uno interno in `Layout` attorno a
  `<Outlet/>` cosi' la shell (TopBar/Footer/TimerPill) resta durante il caricamento.
  Nuovo `components/PageLoader.jsx` (spinner). Bundle iniziale ridotto, niente
  piu' warning chunk >500kB.
- ✅ **Verificato**: `npm run lint` + `npm run build` ok.

### 2026-07-13 - Claude (sync cloud diario + .env.example)

- **Sync cloud Alimentazione (Fase 5/6, parziale)**: colmato il buco noto "il
  diario non e' sincronizzato". Ponte local-first + mirror speculare a quello
  degli allenamenti: `hooks/useNutritionSync.js` (usato da `Alimentazione`) +
  `services/nutrition.js` (`fetchDiary`/`replaceDiary`, full-replace) che
  consumano le tabelle GIA' esistenti `public.meal_logs` + `public.meal_entries`
  (migrazione 20260708170000, nessuna nuova migrazione). Nuovo marcatore
  `fitpulse-diario-owner` + helper `loadDiarioOwner`/`saveDiarioOwner`/
  `diarioHasData` in `nutritionDefaults`. Mapping pasti `snacks`↔`snack`.
  No-op se Supabase non configurato. NB: gli OBIETTIVI nutrizionali restano solo
  in localStorage (manca la tabella; da assegnare al lato backend/Codex).
- **`.env.example`**: creato (era referenziato dal README ma assente). Documenta
  `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (frontend) e
  `SUPABASE_SERVICE_ROLE_KEY` (solo importer).
- ✅ **Verificato**: `npm run lint` + `npm run build` ok.
- ⚠️ Sync diario da provare **end-to-end** da loggato su Supabase reale.

### 2026-07-13 - Claude (ponte cloud allenamenti + Alimentazione + README)

- **Fase 5 avviata (allenamenti)**: ponte LOCAL-FIRST + MIRROR in
  `src/hooks/useWorkoutSync.js`, usato da `Palestra`. localStorage resta il
  motore; da loggato riconcilia al login (pull dal DB / adozione dati anonimi /
  clean se il locale e' di un altro utente) e rispecchia ogni modifica via
  `replaceWorkoutDays` (debounce). Nuovo marcatore `fitpulse-giornate-owner`
  (userId proprietario dei dati locali) per non spingere i dati di un utente nel
  DB di un altro sullo stesso browser. No-op se Supabase non configurato.
- **Alimentazione** (era placeholder): diario giornaliero localStorage-first.
  4 pasti, inserimento manuale alimenti (kcal + P/C/G), riepilogo anello kcal +
  barre macro vs obiettivi, navigazione per data, obiettivi modificabili. Nuovi:
  `data/nutritionDefaults.js`, `components/FoodEditor.jsx`,
  `components/NutritionGoalsEditor.jsx`. Chiavi localStorage `fitpulse-diario` e
  `fitpulse-nutrition-goals`. i18n `nutrition.*` in tutte e 5 le lingue.
  NB: il diario NON e' ancora sincronizzato su Supabase (solo locale).
- **README** riscritto (era il template Vite) con feature, stack, setup, nota AI.
- ✅ **Verificato**: `npm run lint` 0 errori + `npm run build` ok (warning chunk
  >500kB preesistente, non bloccante). Fix in `useWorkoutSync`: aggiornamento del
  ref spostato in `useEffect` (react-hooks/refs vieta di scrivere un ref in render).
- ⚠️ Il ponte cloud allenamenti resta da provare **end-to-end** da loggato su Supabase.
- 📁 **Spostamento cartella**: il progetto ora vive in `d:\progetti\sport-fitness`
  (prima `c:\Users\simone\Desktop\sport-fitness`, ora copia stale/incompleta).

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
