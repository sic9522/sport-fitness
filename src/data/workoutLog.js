// Registro degli allenamenti EFFETTIVAMENTE SVOLTI, persistito in localStorage.
// Da non confondere con le giornate (giornateDefaults), che sono il PIANO settimanale:
// qui finisce solo ciò che è stato davvero completato, ed è la sola fonte onesta per
// l'activity trend e per la stima delle calorie bruciate.
// Voce = { id, date: 'YYYY-MM-DD', nome, durationMin, exercises }
import { dayKey } from '../utils/date'
import { newId } from './ids'

const KEY = 'fitpulse-workout-log'

export { newId as newSessionId }

// MET (Metabolic Equivalent of Task) del sollevamento pesi tipico, da Compendium of
// Physical Activities: ~5.0 per uno sforzo vigoroso. Serve solo alla STIMA delle kcal:
// senza un cardiofrequenzimetro non esiste un valore misurato, e l'app deve dirlo.
export const STRENGTH_MET = 5.0

export function loadWorkoutLog() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (Array.isArray(saved)) return saved
  } catch {
    // dato corrotto → registro vuoto
  }
  return []
}

export function saveWorkoutLog(log) {
  localStorage.setItem(KEY, JSON.stringify(log))
}

// --- Funzioni PURE (testate): non toccano localStorage né l'orologio. ---

// Ordina dalla più recente alla più vecchia (ISO → confronto lessicografico = cronologico).
export function sortSessions(log) {
  return [...log].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

// Aggiunge una sessione e riordina. Normalizza i numeri (durata/esercizi) perché
// possono arrivare come stringhe dai campi di input.
export function addSession(log, session) {
  const clean = {
    ...session,
    durationMin: Math.max(0, Number(session.durationMin) || 0),
    exercises: Math.max(0, Number(session.exercises) || 0),
  }
  return sortSessions([...log, clean])
}

export function removeSession(log, id) {
  return log.filter(s => s.id !== id)
}

// Sessioni svolte in un dato giorno.
export function sessionsOn(log, key) {
  return (log || []).filter(s => s.date === key)
}

// Minuti totali allenati in un giorno: è la barra dell'activity trend.
export function minutesOn(log, key) {
  return sessionsOn(log, key).reduce((sum, s) => sum + (Number(s.durationMin) || 0), 0)
}

// STIMA delle kcal bruciate con la formula MET:
//   kcal = MET × 3.5 × peso(kg) / 200 × minuti
// Senza il peso non si può stimare nulla di sensato → null (l'interfaccia mostrerà
// un trattino invece di un numero inventato).
export function estimateKcal(durationMin, weightKg, met = STRENGTH_MET) {
  const min = Number(durationMin) || 0
  const kg = Number(weightKg) || 0
  if (min <= 0 || kg <= 0) return null
  return Math.round((met * 3.5 * kg / 200) * min)
}

// Kcal stimate bruciate in un giorno (null se manca il peso: vedi estimateKcal).
export function burnedOn(log, key, weightKg) {
  const min = minutesOn(log, key)
  return estimateKcal(min, weightKg)
}

// Serie per il grafico activity trend: un punto per chiave-giorno, in ordine.
export function activitySeries(log, keys) {
  return (keys || []).map(key => ({
    key,
    minutes: minutesOn(log, key),
    sessions: sessionsOn(log, key).length,
  }))
}

// Sessione pronta da salvare a partire da una scheda completata. `date` di default
// oggi; il chiamante può forzarla (es. registrare un allenamento di ieri).
export function sessionFromScheda(scheda, durationMin, date = dayKey()) {
  return {
    id: newId(),
    date,
    nome: scheda?.nome || '',
    durationMin: Math.max(0, Number(durationMin) || 0),
    exercises: scheda?.esercizi?.length || 0,
  }
}

export function workoutLogHasData(log) {
  return Array.isArray(log) && log.length > 0
}

// --- Allenamento IN CORSO ---
// Persistito a parte perché sopravvive al refresh e al cambio pagina: si salva
// l'istante di inizio e la durata si MISURA alla fine, invece di chiederla a mano.
const ACTIVE_KEY = 'fitpulse-active-workout'

export function loadActiveWorkout() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null')
    if (saved && Number(saved.startedAt) > 0) return saved
  } catch {
    // dato corrotto → nessun allenamento in corso
  }
  return null
}

export function saveActiveWorkout(active) {
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(active))
}

export function clearActiveWorkout() {
  localStorage.removeItem(ACTIVE_KEY)
}

// Secondi trascorsi dall'inizio. Mai negativo (orologio spostato indietro → 0).
export function elapsedSec(startedAt, now = Date.now()) {
  const sec = Math.floor((now - Number(startedAt || 0)) / 1000)
  return sec > 0 ? sec : 0
}

// mm:ss per il pulsante dell'allenamento in corso.
export function formatElapsed(sec) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
