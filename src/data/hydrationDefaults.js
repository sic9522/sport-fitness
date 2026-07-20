// Idratazione giornaliera, persistita in localStorage. Local-first come il resto dell'app.
// Store: { 'YYYY-MM-DD': ml } — i millilitri bevuti in quel giorno, non le singole bevute:
// il dato utile è il totale, e così il record resta minuscolo anche dopo anni.
const KEY = 'fitpulse-hydration'
const GOAL_KEY = 'fitpulse-hydration-goal'

// Obiettivo di default (ml) e taglio del "bicchiere" del tasto rapido.
export const DEFAULT_HYDRATION_GOAL_ML = 2000
export const GLASS_ML = 250

export function loadHydration() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved
  } catch {
    // dato corrotto → store vuoto
  }
  return {}
}

export function saveHydration(store) {
  localStorage.setItem(KEY, JSON.stringify(store))
}

export function loadHydrationGoal() {
  const raw = Number(localStorage.getItem(GOAL_KEY))
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_HYDRATION_GOAL_ML
}

export function saveHydrationGoal(ml) {
  localStorage.setItem(GOAL_KEY, String(ml))
}

// --- Funzioni PURE (testate): non toccano localStorage. ---

// Millilitri bevuti in un giorno. Sempre un numero, anche per giorni mai registrati.
export function dayMl(store, key) {
  const v = Number(store?.[key])
  return Number.isFinite(v) && v > 0 ? v : 0
}

// Aggiunge (o sottrae, con delta negativo) millilitri a un giorno e restituisce un
// NUOVO store. Non scende mai sotto zero; a zero la chiave si rimuove, così i giorni
// senza dati non sporcano lo store né i backup.
export function addMl(store, key, delta) {
  const next = { ...store }
  const total = dayMl(store, key) + Number(delta || 0)
  if (total > 0) next[key] = total
  else delete next[key]
  return next
}

// Percentuale sull'obiettivo, tagliata a 100: serve agli anelli/barre di progresso.
export function hydrationPct(ml, goalMl) {
  if (!goalMl || goalMl <= 0) return 0
  return Math.min(100, Math.round((ml / goalMl) * 100))
}

// true se c'è almeno un giorno con un valore reale (per backup/sync: uno store con
// sole chiavi a zero non conta come "ha dati").
export function hydrationHasData(store) {
  return Object.keys(store || {}).some(k => dayMl(store, k) > 0)
}
