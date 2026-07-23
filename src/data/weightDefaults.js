// Registro del peso corporeo, persistito in localStorage.
// Voce = { id, date: 'YYYY-MM-DD', kg: number }. Una voce per data (upsert).
// Local-first come il resto dell'app.
const KEY = 'fitpulse-weight'

export { newId as newWeightId } from './ids'

// Data odierna YYYY-MM-DD in fuso LOCALE (helper impuro a livello di modulo, come
// newId in giornateDefaults, per tenere new Date() fuori dai componenti).
export function todayISO() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// Ordina per data crescente (stringhe ISO → confronto lessicografico = cronologico).
export function sortByDate(entries) {
  return [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

// Inserisce o aggiorna: rimpiazza la voce con stessa id o stessa data, poi riordina.
export function upsertEntry(entries, entry) {
  const others = entries.filter(e => e.id !== entry.id && e.date !== entry.date)
  return sortByDate([...others, { ...entry, kg: Number(entry.kg) }])
}

export function removeEntry(entries, id) {
  return entries.filter(e => e.id !== id)
}

// Voce più recente (o null).
export function latestEntry(entries) {
  const s = sortByDate(entries)
  return s[s.length - 1] || null
}

// Penultima voce (o null): serve per la variazione rispetto alla misura precedente.
export function previousEntry(entries) {
  const s = sortByDate(entries)
  return s.length >= 2 ? s[s.length - 2] : null
}

// Variazione (kg) tra ultima e penultima misura, arrotondata a 1 decimale (o null).
export function weightDelta(entries) {
  const l = latestEntry(entries)
  const p = previousEntry(entries)
  if (!l || !p) return null
  return Math.round((l.kg - p.kg) * 10) / 10
}

export function loadWeights() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (Array.isArray(saved)) return sortByDate(saved)
  } catch {
    // dato corrotto → registro vuoto
  }
  return []
}

export function saveWeights(entries) {
  localStorage.setItem(KEY, JSON.stringify(sortByDate(entries)))
}
