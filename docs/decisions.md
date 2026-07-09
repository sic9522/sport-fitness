# Architecture Decisions

Questo file registra decisioni architetturali condivise. Ogni decisione deve
essere breve, motivata e aggiornata se cambia.

## ADR-001 - Supabase Come Backend Primario

Stato: accepted

Decisione:

Usiamo Supabase per Auth, PostgreSQL, Storage e, dove serve, funzioni server-side.

Motivo:

- accelera lo sviluppo
- mantiene PostgreSQL come database relazionale solido
- offre RLS integrata
- riduce complessita operativa iniziale

Conseguenze:

- serve progettare bene policy RLS
- le chiavi private non devono entrare nel frontend
- le migrazioni SQL diventano parte critica del progetto

## ADR-002 - Non Creare Tabella `users`

Stato: accepted

Decisione:

Non creiamo una tabella `users` applicativa. Usiamo `auth.users` e `profiles`.

Motivo:

- evita duplicazione identita
- riduce rischio inconsistenza
- segue il modello Supabase

## ADR-003 - Cataloghi Globali Separati Dai Dati Utente

Stato: accepted

Decisione:

Esercizi e alimenti importati da API esterne sono cataloghi globali. Workout,
log, preferiti, obiettivi e diario alimentare sono dati personali.

Motivo:

- scala meglio
- evita duplicazioni per utente
- permette aggiornamenti catalogo senza toccare dati personali

## ADR-004 - JSON Sorgente, Non Database Finale

Stato: accepted

Decisione:

`exercises.json` e sorgente dati iniziale, non database finale.

Motivo:

- il JSON non supporta ricerca, relazioni, indici, traduzioni e media in modo
  professionale
- il database finale deve essere normalizzato

## ADR-005 - Immagini Su Supabase Storage

Stato: accepted

Decisione:

Le immagini del repository Free Exercise DB devono essere importate su Supabase
Storage. GitHub non e provider finale.

Motivo:

- controllo su disponibilita e caching
- possibilita di sostituire provider in futuro
- migliore integrazione con DB e policy

## ADR-006 - Ricerca Iniziale In PostgreSQL

Stato: accepted

Decisione:

La ricerca esercizi parte con PostgreSQL FTS, GIN index, alias e trigram.

Motivo:

- riduce dipendenze esterne
- e sufficiente per la prima scala
- mantiene dati e ricerca nello stesso stack

Conseguenza:

Se in futuro ranking, typo tolerance o carico diventano troppo complessi,
potremo aggiungere Meilisearch, Typesense o altro motore dedicato.

## ADR-007 - Import Idempotenti

Stato: accepted

Decisione:

Gli script import devono poter essere rilanciati senza duplicare o corrompere
dati.

Motivo:

- import grandi possono fallire
- dataset e immagini possono cambiare
- serve manutenzione sicura nel tempo

## ADR-008 - Niente API Esterne Dirette Dal Frontend

Stato: accepted

Decisione:

Il frontend non chiama direttamente ExerciseDB o API nutrizione se servono
chiavi o trasformazioni.

Motivo:

- protegge segreti
- evita rate limit lato utente
- consente normalizzazione e controllo qualita

## ADR-009 - Schemi Enterprise Separati Senza Rompere `public`

Stato: accepted

Decisione:

Il nuovo modello enterprise viene introdotto negli schemi `catalog`, `app` e
`private` senza cancellare subito le tabelle `public` esistenti.

Motivo:

- il frontend attuale puo continuare a funzionare
- riduce rischio durante la migrazione
- permette di importare e validare il catalogo prima di cambiare UI e servizi

Conseguenze:

- per un periodo ci saranno tabelle legacy e tabelle enterprise
- i servizi React andranno migrati gradualmente verso il nuovo schema
