// Statistiche riassuntive di una SCHEDA (es. "Pull Day"), per la riga informativa.
//
// Tutto passa da buildSteps: e' gia' la funzione che espande la scheda nella sequenza
// piatta delle serie, gestendo split (ogni serie ha le sue ripetizioni) e non-split (una
// riga valida per tutte). Rifare qui quella logica avrebbe significato duplicarla, con
// la certezza che prima o poi le due versioni sarebbero divergute sugli split.
import { buildSteps } from './workoutPlayer'

// Secondi stimati per una singola ripetizione. Valore di progetto, non misurato:
// serve a dare un ordine di grandezza, non a cronometrare l'utente.
export const SECONDS_PER_REP = 3.5

// Quota di esercizi completati oltre la quale la scheda si considera "andata bene".
// Isolata qui perche' e' una soglia di prodotto, non un dettaglio della card: se un
// giorno diventasse 80% si cambia un numero solo.
export const COMPLETION_THRESHOLD = 0.7

// Frazione 0-1 di completamento. Totale a zero -> 0, senza divisioni per zero.
export function completionRatio(done, total) {
  const d = num(done)
  const tot = num(total)
  return tot > 0 ? Math.min(1, d / tot) : 0
}

// Recupero usato quando la scheda non ne definisce uno. Vive qui perche' e' la stessa
// costante che governa il player: tenerne due copie avrebbe fatto divergere la stima
// mostrata dal recupero realmente applicato durante l'allenamento.
export const DEFAULT_REST_SECONDS = 60

const num = v => {
  const n = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

// Recupero effettivo della scheda, in secondi.
export const schedaRest = scheda =>
  num(scheda?.rest) > 0 ? num(scheda.rest) : DEFAULT_REST_SECONDS

// Ripetizioni totali previste: somma delle ripetizioni di OGNI serie.
// Con split le serie hanno valori diversi, quindi non basta moltiplicare.
export function totalReps(scheda) {
  return buildSteps(scheda).reduce((sum, step) => sum + num(step.reps), 0)
}

// Numero di esercizi della scheda. Il conteggio resta quello gia' in uso (la lunghezza
// dell'elenco): qui e' solo esposto insieme agli altri, senza cambiarne la logica.
export const exerciseTotal = scheda => (Array.isArray(scheda?.esercizi) ? scheda.esercizi.length : 0)

// Durata REALE della sessione in HH:MM (es. "00:24"). Diversa dalla stima: qui si
// misura, li' si prevede.
export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.round(num(totalSeconds)))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Giorno e mese dell'ultima sessione, "GG/MM". Null se non se n'e' mai svolta una.
export function formatDayMonth(timestamp) {
  const ms = Number(timestamp)
  if (!Number.isFinite(ms) || ms <= 0) return null
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return null
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Tempo TEORICO dell'allenamento, in secondi:
//     Σ ( ripetizioni × SECONDS_PER_REP + recupero )
// su tutte le serie. E' una stima basata solo su cio' che e' configurato nella scheda:
// non va corretta col tempo realmente impiegato, perche' l'utente puo' sforare il
// recupero o eseguire le ripetizioni a velocita' diverse — sarebbe un altro dato.
// Il recupero e' incluso anche dopo l'ultima serie, come da formula.
export function estimatedSeconds(scheda) {
  const rest = schedaRest(scheda)
  return buildSteps(scheda).reduce(
    (sum, step) => sum + num(step.reps) * SECONDS_PER_REP + rest,
    0,
  )
}

// Durata leggibile: i secondi non aggiungono nulla a una STIMA, quindi si arrotonda al
// minuto. Sopra l'ora si passa a "1 h 08 min", con i minuti a due cifre perche' "1 h 8 min"
// si legge peggio in una riga di numeri.
export function formatDuration(totalSeconds) {
  const minutes = Math.round(num(totalSeconds) / 60)
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h} h ${String(m).padStart(2, '0')} min`
}

// Riepilogo TEORICO della scheda (prima colonna della card): cosa prevede il piano.
// Una sola chiamata invece di quattro, e un solo passaggio concettuale da ricordare.
export function schedaSummary(scheda) {
  return {
    exercises: exerciseTotal(scheda),
    reps: totalReps(scheda),
    seconds: estimatedSeconds(scheda),
  }
}
