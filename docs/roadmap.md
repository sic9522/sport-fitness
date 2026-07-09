# Roadmap

Roadmap tecnica di FitPulse.

## Fase 0 - Stabilizzazione Documentale

- Creare documenti architetturali.
- Allineare Codex e Claude su decisioni e fonte di verita.
- Confermare stack: React, Vite, Supabase, PostgreSQL, Supabase Storage.

## Fase 1 - Fondazioni Supabase

- Creare progetto Supabase reale.
- Configurare `.env.local`.
- Applicare migrazioni iniziali solo se ancora coerenti.
- Decidere se sostituire le migrazioni provvisorie con schema enterprise.
- Verificare auth end-to-end.

## Fase 2 - Schema Enterprise Catalogo Esercizi

- Creare schema normalizzato esercizi.
- Rinominare o sostituire tabelle ambigue.
- Aggiungere media provider-agnostic.
- Aggiungere alias e traduzioni.
- Aggiungere search documents.

Stato:

- Migrazione enterprise foundation creata in `supabase/migrations/20260708173000_enterprise_foundation.sql`.
- Le vecchie tabelle `public` restano per compatibilita temporanea.

## Fase 3 - Import Dataset Iniziale

- Aggiungere `exercises.json` al processo di import.
- Validare payload.
- Importare esercizi normalizzati.
- Importare muscoli, equipment, categorie.
- Generare slug e alias.
- Scaricare immagini.
- Caricare immagini su Supabase Storage.
- Salvare `exercise_media`.
- Rendere lo script idempotente.

Stato:

- Script iniziale creato in `scripts/import-exercises.mjs`.
- Mancano ancora nel workspace `exercises.json` e cartella immagini.

## Fase 4 - Ricerca Esercizi

- Implementare FTS PostgreSQL.
- Aggiungere estensione trigram.
- Supportare italiano, inglese, alias, abbreviazioni ed errori comuni.
- Esporre servizio frontend paginato.
- Integrare ricerca nella pagina palestra.

## Fase 5 - Workout Utente

- Migrare da `localStorage` a Supabase.
- Creare piani, giornate, esercizi, set.
- Registrare sessioni reali.
- Salvare log e record personali.
- Aggiungere preferiti.

## Fase 6 - Nutrizione

- Scegliere API alimentazione.
- Creare schema `foods`.
- Importare catalogo alimenti.
- Creare diario alimentare.
- Collegare obiettivi nutrizionali.

## Fase 7 - Scalabilita e Osservabilita

- Aggiungere import logs.
- Monitorare query lente.
- Ottimizzare indici con `explain`.
- Valutare lazy loading frontend.
- Valutare partitioning sui log ad alto volume.
- Preparare backup e restore strategy.

## Fase 8 - Evoluzioni Future

- Programmi condivisibili.
- Marketplace schede.
- Coach/team.
- Analytics avanzate.
- Video esercizi.
- Provider immagini alternativo.
- Search engine dedicato se Postgres non basta.
