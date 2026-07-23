// Esito dell'ULTIMA sessione svolta, per singola scheda.
//
// Perche' serve: la sessione del player vive in memoria e sparisce quando finisce, ma la
// card della scheda deve continuare a mostrare quante ripetizioni sono state completate
// anche a distanza di giorni. Qui si conserva solo il risultato, non la sessione.
//
// E' uno store OSSERVABILE (stesso schema di syncStatus) invece di una semplice coppia
// load/save: la card deve aggiornarsi da sola mentre l'allenamento procede, e leggere
// localStorage dentro un effect avrebbe richiesto un setState a ogni cambio di sessione —
// vietato da react-hooks/set-state-in-effect e comunque una cascata di render inutile.
//
// Modello: { [schedaId]: { reps, exercises, seconds, at } }
//   reps      = ripetizioni completate (soglia 50% per esercizio, vedi workoutPlayer)
//   exercises = esercizi completati, stessa soglia
//   seconds   = durata REALE della sessione (misurata, non stimata)
//   at        = istante dell'ultima sessione, completata O interrotta: la card mostra
//               comunque la data, perche' anche un allenamento lasciato a meta' e' stato
//               fatto e sapere quando risalgono le cifre e' parte dell'informazione.
const KEY = 'fitpulse-scheda-progress'

const listeners = new Set()
let cache = null // snapshot stabile: useSyncExternalStore esige la STESSA referenza

function readStorage() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved
  } catch {
    // dato corrotto -> si riparte da vuoto: e' una statistica, non un dato da recuperare
  }
  return {}
}

export function subscribeSchedaProgress(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Snapshot corrente. Legge da localStorage una volta sola, poi serve la copia in memoria.
export function getSchedaProgress() {
  if (cache === null) cache = readStorage()
  return cache
}

export function saveSchedaProgress(progress) {
  cache = progress || {}
  localStorage.setItem(KEY, JSON.stringify(cache))
  listeners.forEach(l => l())
}

const positive = v => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0
}

// Esito registrato per una scheda. Restituisce sempre un oggetto completo, cosi' chi lo
// legge non deve difendersi dai campi mancanti dei dati salvati prima di questo modello.
export function schedaEntry(progress, schedaId) {
  const e = progress?.[schedaId] || {}
  return {
    reps: positive(e.reps),
    exercises: positive(e.exercises),
    seconds: positive(e.seconds),
    at: positive(e.at) || null,
  }
}

// Registra l'avanzamento. Chiamata a ogni cambio di sessione, cosi' la card e' aggiornata
// sia durante l'allenamento sia dopo, senza dover distinguere i due casi.
export function setSchedaEntry(progress, schedaId, { reps, exercises, seconds }, at = Date.now()) {
  if (!schedaId) return progress
  return {
    ...progress,
    [schedaId]: {
      reps: positive(reps),
      exercises: positive(exercises),
      seconds: positive(seconds),
      at,
    },
  }
}

// Azzera all'avvio di un nuovo allenamento: la card mostra l'ULTIMA sessione, quindi
// iniziarne una nuova deve ripartire da zero invece di sommarsi alla precedente.
export const resetSchedaEntry = (progress, schedaId) =>
  setSchedaEntry(progress, schedaId, { reps: 0, exercises: 0, seconds: 0 })
