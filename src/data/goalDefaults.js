// Obiettivi dell'utente. Si definiscono SOLO su base giornaliera: settimana e mese
// vengono derivati, così un obiettivo non può più contraddire se stesso fra i tre periodi.
//
// Derivazione (vedi scaleGoal):
//  - obiettivo GIORNALIERO ("bevi 2 l"): settimana = ×7, i giorni della settimana;
//  - obiettivo PER ALLENAMENTO ("60 min di cardio"): settimana = × il numero di
//    allenamenti che ti sei prefissato, perché quel traguardo vale per ogni sessione;
//  - mese = valore settimanale × settimane del mese.
//
// `perWorkout` distingue i due casi: senza, "2000 kcal al giorno" diventerebbe
// "2000 × allenamenti" a settimana, che non vorrebbe dire nulla.

export const MAX_GOALS = 5

// Emoji proposte; l'editor consente comunque di inserirne una qualsiasi.
export const GOAL_EMOJIS = ['🔥', '💧', '💪', '🏃', '😴']

export const GOAL_UNITS = ['Kcal', 'g', 'l', 'min', 'h']

// titleKey = nome tradotto per gli obiettivi predefiniti. Se l'utente cambia il titolo,
// titleKey viene rimosso e resta il testo scritto.
export const DEFAULT_GOALS = [
  { id: 'g1', emoji: '🔥', title: 'Calorie consumate', titleKey: 'goal.calorieEaten', target: 2000, unit: 'Kcal', perWorkout: false },
  { id: 'g2', emoji: '💧', title: 'Acqua bevuta', titleKey: 'goal.waterDrunk', target: 2.5, unit: 'l', perWorkout: false },
  { id: 'g3', emoji: '💪', title: 'Minuti allenamento', titleKey: 'goal.workoutMin', target: 60, unit: 'min', perWorkout: true },
]

export const newGoalId = () => (crypto?.randomUUID && crypto.randomUUID()) || String(Date.now())

// --- Funzioni PURE (testate) ---

// Prima lettera maiuscola, il resto invariato: "corsa mattutina" → "Corsa mattutina".
// Non si tocca il seguito, così sigle e nomi propri restano come li ha scritti l'utente.
export function capitalizeFirst(text) {
  const trimmed = String(text ?? '').trimStart()
  if (!trimmed) return ''
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

// Tiene solo cifre e UN separatore decimale, normalizzato a punto: il campo obiettivo
// deve accettare 2,5 litri ma non lettere, spazi o segni.
export function numericOnly(value) {
  const cleaned = String(value ?? '').replace(',', '.').replace(/[^\d.]/g, '')
  const [head, ...rest] = cleaned.split('.')
  return rest.length ? `${head}.${rest.join('')}` : head
}

// Settimane coperte da un mese: quante righe servirebbero su un calendario.
// Un mese non è mai esattamente 4 settimane, e arrotondare per difetto sottostimerebbe
// l'obiettivo mensile.
export function weeksInMonth(year, month) {
  const days = new Date(year, month, 0).getDate()
  const firstDay = (new Date(year, month - 1, 1).getDay() + 6) % 7 // lunedì = 0
  return Math.ceil((days + firstDay) / 7)
}

const round1 = n => Math.round(n * 10) / 10

// Valore dell'obiettivo per il periodo richiesto.
// `workoutsPerWeek` è l'obiettivo di allenamenti settimanali impostato in Palestra.
export function scaleGoal(goal, period, { workoutsPerWeek = 3, weeks = 4 } = {}) {
  const target = Number(goal?.target) || 0
  if (period === 'daily') return target

  const weekly = goal?.perWorkout
    ? target * Math.max(0, Number(workoutsPerWeek) || 0)
    : target * 7

  if (period === 'weekly') return round1(weekly)
  return round1(weekly * Math.max(1, Number(weeks) || 1))
}

// Obiettivi già scalati per il periodo, pronti da mostrare.
export function goalsForPeriod(goals, period, opts) {
  return (Array.isArray(goals) ? goals : []).map(g => ({ ...g, target: scaleGoal(g, period, opts) }))
}

// --- Persistenza ---
const KEY = 'fitpulse-goals'

export function loadGoals() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (Array.isArray(saved)) return saved.slice(0, MAX_GOALS)
    // Migrazione dal vecchio formato { daily, weekly, monthly }: si tengono i soli
    // giornalieri, perché ora settimana e mese si calcolano da quelli.
    if (saved && Array.isArray(saved.daily)) {
      return saved.daily.slice(0, MAX_GOALS).map(g => ({ ...g, perWorkout: Boolean(g.perWorkout) }))
    }
  } catch {
    // dato corrotto → predefiniti
  }
  return DEFAULT_GOALS
}

export function saveGoals(goals) {
  localStorage.setItem(KEY, JSON.stringify((goals || []).slice(0, MAX_GOALS)))
}
