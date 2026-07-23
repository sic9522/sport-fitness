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
Rotte dentro Layout: `/` Home, `/palestra`, `/alimentazione`,
`/alimentazione/prodotti`, `/timer`,
`/profilo`, `/impostazioni` (+ `/colori`, `/obiettivi`, `/lingua`, `/backup`), e catch-all
`*` -> `NotFound` (dentro Layout, mantiene TopBar/Footer).
Fuori Layout: `/registrazione` (wizard). `BrowserRouter` sta in `main.jsx`.
Il login e' una MODALE aperta dall'icona utente in alto a destra (non piu' una
rotta `/login`).

## Auth e registrazione

- Icona in alto a destra = `components/auth/UserMenu`: se non loggato apre
  `LoginModal` (email/password + provider OAuth via `ProviderButtons`); se loggato
  apre un menu (Profilo/Impostazioni/Esci), predisposto a nuove voci.
- Metodi alternativi elencati in `lib/authProviders.js`. Aggiungerne = una voce li'.
  Servizi auth in `services/auth.js` (email + OTP telefono + OAuth + signOut).
  **Oggi in UI c'e' solo Google**: numero e GitHub sono commentati perche' non
  ancora configurati lato Supabase (Twilio / OAuth App). Il codice resta completo:
  riattivarli = togliere il commento (voce + import icona).
- Accesso col numero = OTP via SMS (provider Phone di Supabase su Twilio):
  `components/auth/PhoneOtpForm` (numero -> codice), usato dal login e dallo step
  "metodo" del wizard. Il numero si normalizza in E.164 (`toE164`, default +39);
  nel login `shouldCreateUser: false` per non registrare chi non e' iscritto.
  Nel wizard la verifica avviene subito: dopo il codice la sessione c'e' gia' e
  restano solo i dati del profilo (stesso percorso del ritorno da OAuth).
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
  - Scheda = `{ id, nome, esercizi:[], custom?, rest? }`. Il `nome` si sceglie alla
    CREAZIONE (`PromptModal` in `GiornataView`) e dentro la scheda è in sola lettura.
    `rest` = secondi di recupero della singola scheda (indipendente; se assente si usa
    il recupero globale del `TimerContext`). NB: `rest` NON è ancora mappato sul cloud
    (`public.workout_cards` non ha la colonna): con la sync attiva andrebbe perso.
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
- `Prodotti` (`/alimentazione/prodotti`, bottone "Prodotti" sotto "Aggiungi
  pasto"): tab **Prodotti**, a sua volta divisa in due liste —
  *Lista personalizzata* (i generici nostri + tutto quello dell'utente, tenuti in
  memoria: una query sola, `listGenericFoods`) e *Tutti gli alimenti* (il
  catalogo `food_items` a pagine da 50, `listFoodItems`, con intestazioni di
  lettera da `data/foodIndex` e cifre/simboli in fondo sotto `#`).
  Entrambe hanno ricerca + barra comandi (`FoodFilterBar`): ordinamento per nome,
  kcal o macro (`data/foodSort`) e selezione multipla. Ordinare la lista completa
  RICARICA dal database (riordinare la sola pagina caricata darebbe una classifica
  finta); le lettere spariscono se l'ordine non e' alfabetico. **Pressione
  prolungata = modifica** (non il doppio click: su un elenco che si scorre col
  dito due tocchi rapidi capitano per sbaglio), e solo sulla roba propria —
  catalogo e generici sono un database condiviso in sola lettura.
  **Il tasto rosso qui NASCONDE, non cancella** (occhio sbarrato): vale per
  tutto il selezionato, roba propria compresa. Cancellare davvero si fa dalla tab
  Personali. Sul cloud vanno solo gli id di CATALOGO: quelli della roba propria
  sono locali e `hidden_food_items` ha una chiave esterna su `food_items`
  (`data/hiddenFoods` + `hooks/useHiddenFoods` + tabella
  `public.hidden_food_items`, migrazione 20260723170000). Nascosto = sparito da
  tutti gli elenchi E dalla ricerca del diario, su tutti i dispositivi
  dell'utente. Local-first: funziona da non loggati, e al login le due liste si
  UNISCONO (nascondere si somma, non entra in conflitto). Il ripristino e'
  l'unica operazione che toglie, e cancella anche sul cloud; il link "Ripristina"
  compare solo quando c'e' qualcosa da ripristinare e chiede conferma. Tab
  **Personali** = tre blocchi (`PersonalSection`), in ordine: Alimenti
  personalizzati (`CustomFoodEditor`), Alimenti composti (`CompositeFoodEditor`),
  Pasti personalizzati (`CustomMealEditor`). Ogni blocco ha il suo tasto di
  creazione, che cambia forma: card grande esplicativa finche' il blocco e'
  vuoto, "+" accanto al titolo appena c'e' del contenuto.
  In `data/customFoods` semplici e composti stanno nella STESSA lista (serve alla
  ricerca e al controllo dei nomi); la pagina li separa con `isCompositeFood`.
  Un **composto** e' una ricetta: fino a 20 alimenti scelti col campo di ricerca,
  ognuno coi propri GRAMMI; nessun valore nutrizionale si scrive a mano.
  `compositeNutrients` calcola due cose: il TOTALE del piatto (somma di
  valore/100 g × grammi) e il valore PER 100 G, riferito ai grammi del **primo**
  alimento (l'"alimento principale"), non al peso totale. Cosi' "carbonara da
  800 kcal con 200 g di pasta" significa che 100 g nel diario valgono 400 kcal:
  e' il peso che si misura davvero in cucina. Sulle colonne standard
  (`calories_kcal`…) si salva il per-100 g, quindi il diario riscala senza sapere
  che e' un composto; `total_kcal`, `main_grams` e i `components` (coi grammi)
  restano come spiegazione. Si riconosce dall'asterisco nel nome
  (`foodDisplayName`). Un composto puo' avere delle **varianti** (lo stesso piatto
  fatto diverso): vivono dentro di lui (`addVariant`), nell'elenco lo rendono un
  accordion (uno aperto alla volta), al massimo 5 (`MAX_VARIANTS`).
  **In ricerca NON compaiono**: la tendina porta sempre l'originale, e la
  variante si sceglie dopo, nella modale "Aggiungi un pasto", con una riga di
  bottoni V1…V5 tra il nome e i grammi (ripremuto, il bottone attivo torna
  all'originale). Sette righe quasi identiche in tendina sarebbero solo un
  ostacolo tra l'utente e il piatto che cerca. `flattenCustomFoods` resta per gli
  ELENCHI e per il controllo dei nomi doppi.
- Righe degli elenchi personali (`PersonalRow` in `pages/Prodotti`): click apre
  le varianti, doppio click riapre la modale per modificare, pressione prolungata
  arma il cestino rosso, che poi chiede conferma.
- **Uscita e salvataggio delle modali di Alimentazione**: `hooks/useModalGuard` +
  `ui/ModalActions`. "Salva" e' disabilitato se non c'e' niente da salvare
  (`useDirty` confronta la form con com'era all'apertura); premuto, mostra
  "Salvataggio confermato" per mezzo secondo e chiude. X e Annulla chiedono
  conferma solo se ci sono modifiche, "Ricomincia" idem. Ricominciare svuota solo
  la FORM: quello che era gia' salvato resta finche' non si salva davvero.
  Gli **alimenti personali** stanno in localStorage con la STESSA forma di una
  riga di `food_items` (`name`, `calories_kcal`, `protein_g`…, `source: 'custom'`),
  cosi' passano per `baseFromFoodItem`/`scaleNutrients` e per la tendina senza
  casi speciali. Valori sempre per 100 g: nella modale la quantita' non e' un
  campo ma un'etichetta fissa "/100 g". `FoodSearchInput` li unisce ai risultati
  del catalogo con `mergeCustomFoods`, che li mette SUBITO DOPO il primo
  ("bistecca" -> Bistecca, Bistecca Simone, Bistecca di manzo…); compaiono
  immediatamente, senza attendere il debounce, perche' sono gia' in memoria.
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
LAYOUT card: altezza fissa `h-[120px]` per tutte, `p-2`, immagine 74px, maniglia 30px,
gap fra le card `gap-[18px]`. Struttura UNICA con Split ON e OFF: contenitore 1 ~45%
(`basis-[45%]`, titolo che va a capo — niente `truncate`) + contenitore 2 ~55%
(`basis-[55%]`, dati centrati verticalmente). Cambia solo il contenuto del secondo:
Split OFF → `ExerciseInfoLine` ("Serie 3" e sotto "Rip. 8 - 30 kg");
Split ON → `ExerciseSetRows` (una riga "Rip. 8 - 30 kg" per serie, righe da
`editorRows` → sempre sincronizzate con la select).
Header scheda: titolo in SOLA LETTURA (il nome si sceglie alla creazione, vedi
`GiornataView`) + Play + recupero + "+", distribuiti con `justify-between`; stessa
altezza (`HEADER_BTN` = `h-9`), Play e recupero stessa larghezza (`w-20`), il "+"
resta `w-9`. Play è per ora SOLO grafica. Il badge recupero è un `RestPicker` e
imposta il recupero DELLA SCHEDA (`scheda.rest`, indipendente; fallback al globale
finché non impostato) — il timer globale/navbar NON è toccato. Il pulsante Organizza
è stato rimosso dall'UI (l'icona `ui/ReorderIcon` resta, riusabile)),
`EsercizioEditor` (modale, tutti i campi obbligatori. LIMITI input: Nome max 40 con
contatore live "n/40" accanto all'etichetta; Rip solo cifre max 2 (la 3ª non entra);
kg max 4 cifre + UN separatore (`,`→`.`); oltre il limite il campo diventa rosso e
mostra il messaggio in OVERLAY sopra il campo (niente shift del layout), che sparisce
dopo 3s, al blur o toccando altrove. Il separatore senza cifre non viene salvato
("12."→"12") e la card mostra il peso senza zeri superflui (`formatKg`: "0.50"→"0.5").
Il campo Nome ha
autocomplete sul catalogo `public.catalog_exercises` via
`services/catalogs.searchCatalogExercises`, che chiama la RPC
`search_catalog_exercises(search, p_locale, max_results)`: ricerca fuzzy e
multilingua — matcha su it/en/es/fr/zh (alias in `catalog_exercise_i18n`) e
mostra il nome nella lingua attiva. Cerca ANCHE per ATTREZZO tramite il
vocabolario `public.catalog_equipment` ("manubri" trova "Curl a Martello", che i
manubri non li ha nel nome); ordine: nome-prefisso, nome-contiene, attrezzo,
refuso. In tendina l'attrezzo compare sotto al nome, tradotto via
`data/equipment.js` (chiavi `equipment.*`). Scegliendo un risultato compila
`titolo` + `foto`. Se Supabase non e' configurato resta input manuale).
Modali riusabili:
`ConfirmModal`, `PromptModal`, `GiornataPickerModal`. Auth: `AuthShell`.
Alimentazione: `FoodEditor` (aggiungi/modifica alimento, riusa `ui/Field`; prima
riga = due select, "Pasto" + "Pasto personalizzato"), `CustomMealEditor` (crea un
pasto personalizzato, stessa veste), `NutritionGoalsEditor` (obiettivi giornalieri).
Il campo Nome/ricerca sul catalogo (tendina risultati + scanner barcode) e'
`FoodSearchInput`, condiviso dalle due modali.
I pasti personalizzati stanno in `data/customMeals.js` (localStorage): stessa forma
di un alimento del diario + `nome`, `meal`, `alimento`. Sceglierne uno nel
`FoodEditor` ne copia i valori nella form e riporta il pasto della giornata.
**Regola dei valori (in entrambe le modali)**: finche' arrivano da un prodotto del
catalogo (`base` = valori/100 g, `scaleNutrients` in `nutritionDefaults`) cambiare i
grammi li riscala tutti; appena l'utente ne scrive uno a mano `base` va a null e
non si ricalcola piu' nulla.

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
