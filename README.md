# FitPulse 💪

App mobile-first per il tracciamento di **allenamenti in palestra** e **alimentazione**, con
obiettivi, progressi e timer di recupero. Progetto **capstone EPICODE**.

> Nota: parte del codice di questo progetto è stata scritta con l'assistenza di strumenti di
> intelligenza artificiale (Claude Code per il frontend, Codex per il backend/Supabase), sotto
> la direzione e revisione dell'autore.

---

## Funzionalità

- **Home** — tre anelli di progresso + obiettivi giornalieri/settimanali/mensili.
- **Palestra** — gerarchia Giornate → Schede → Esercizi:
  - creazione per giorno della settimana, per nome scheda o personalizzata;
  - esercizi con foto (galleria/fotocamera + ritaglio), serie/reps/kg, stati (fatto/saltato);
  - swipe per modificare/eliminare, riordino drag & drop, copia/sposta;
  - progresso settimanale calcolato dagli allenamenti completati.
- **Alimentazione** — diario giornaliero con 4 pasti (colazione/pranzo/cena/spuntini):
  - inserimento manuale alimenti (kcal + proteine/carboidrati/grassi);
  - riepilogo giornata (anello kcal + barre macro) rispetto agli obiettivi;
  - navigazione tra i giorni, obiettivi nutrizionali modificabili.
- **Timer di recupero** — countdown → countup persistente, colori per fase, pillola globale.
- **Impostazioni** — temi e colori personalizzabili (accento, sfondo, barre, anelli),
  obiettivi, lingua.
- **Multilingua** — Italiano, English, Español, Français, 中文.
- **Tema chiaro/scuro** — automatico in base alla luminosità dello sfondo scelto.
- **Account** (opzionale) — registrazione/login via email o Google (Supabase Auth); da loggato
  gli allenamenti si sincronizzano sul cloud.

## Stack

- **React 19** + **Vite**
- **Tailwind CSS v4** (con CSS variables per il theming runtime)
- **React Router v7**
- **@dnd-kit** (drag & drop touch), **react-icons**, **react-easy-crop**
- **Supabase** (`@supabase/supabase-js`) — auth + database (opzionale)
- Persistenza: **localStorage** (motore principale, funziona anche offline)

## Avvio

```bash
npm install
npm run dev      # ambiente di sviluppo
npm run build    # build di produzione
npm run preview  # anteprima della build
npm run lint     # ESLint
```

L'app funziona **subito, senza backend**: i dati vivono in `localStorage`.

### Account e cloud (opzionale)

Per abilitare login e sincronizzazione cloud, crea un file `.env.local` (vedi `.env.example`):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Poi applica le migrazioni SQL in `supabase/migrations/` sul tuo progetto Supabase. Senza queste
variabili l'app resta in modalità solo-locale, senza errori.

## Struttura

```
src/
  pages/         Home, Palestra, Alimentazione, Timer, Impostazioni, Profilo…
  components/    UI riusabile (RingChart, TopBar, editor modali, timer…)
  context/       Theme, Language, Timer, Auth (provider globali)
  data/          modelli + persistenza localStorage (giornate, obiettivi, diario…)
  hooks/         hook riusabili (scroll lock, sync cloud allenamenti…)
  services/      accesso a Supabase (workouts, catalogs, auth, profile)
  i18n/          dizionari delle 5 lingue
  lib/           client Supabase
docs/            documentazione condivisa (architettura, database, roadmap…)
supabase/        migrazioni SQL e seed
```

Per i dettagli architetturali e lo stato di avanzamento vedi la cartella [`docs/`](docs/).
