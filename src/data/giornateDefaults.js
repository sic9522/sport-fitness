// Giornate di allenamento (livello principale in Palestra), persistite in localStorage.
// Gerarchia: giornata → schede → esercizi. Ogni giornata è fissata su un giorno
// della settimana (max 7, uno per giorno). Modello: { id, day, schede: [...] }.
const KEY = 'fitpulse-giornate'
const OLD_SCHEDE_KEY = 'fitpulse-schede'

// Ordine settimana: usato per ordinare le giornate e per il selettore dei giorni.
export const DAYS = [
  { key: 'mon', labelKey: 'day.mon' },
  { key: 'tue', labelKey: 'day.tue' },
  { key: 'wed', labelKey: 'day.wed' },
  { key: 'thu', labelKey: 'day.thu' },
  { key: 'fri', labelKey: 'day.fri' },
  { key: 'sat', labelKey: 'day.sat' },
  { key: 'sun', labelKey: 'day.sun' },
]

export const dayIndex = key => DAYS.findIndex(d => d.key === key)
export const dayLabelKey = key => DAYS.find(d => d.key === key)?.labelKey || key

// Nome visualizzato di una giornata: giorno della settimana tradotto (se `day`),
// altrimenti il nome libero (`nome`: lettera "Scheda A" o personalizzato).
export const giornataName = (g, t) => (g.day ? t(dayLabelKey(g.day)) : (g.nome || ''))

// ID stabile (helper a livello di modulo: tiene le funzioni impure fuori dai componenti).
export const newId = () => (crypto?.randomUUID && crypto.randomUUID()) || String(Date.now())

// C'è già una scheda con lo stesso nome (trim, case-insensitive) tra quelle date?
export const schedaNameTaken = (schede, nome) => {
  const k = (nome || '').trim().toLowerCase()
  return schede.some(s => (s.nome || '').trim().toLowerCase() === k)
}

export function loadGiornate() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (Array.isArray(saved)) return saved // include l'array vuoto (nessuna giornata)
  } catch {
    // dato corrotto → provo la migrazione, poi default vuoto
  }

  // Migrazione una-tantum: le schede sciolte esistenti finiscono in una giornata (Lunedì).
  try {
    const oldSchede = JSON.parse(localStorage.getItem(OLD_SCHEDE_KEY) || 'null')
    if (Array.isArray(oldSchede) && oldSchede.length) {
      const migrated = [{ id: newId(), day: 'mon', schede: oldSchede }]
      saveGiornate(migrated)
      return migrated
    }
  } catch {
    // niente da migrare
  }

  return [] // nessuna giornata: le crea l'utente
}

export function saveGiornate(giornate) {
  localStorage.setItem(KEY, JSON.stringify(giornate))
}

// Proprietario dei dati giornate salvati in localStorage: userId Supabase se sono stati
// riconciliati con un account, oppure null = dati "anonimi" (creati senza login).
// Serve al ponte cloud (useWorkoutSync) per NON spingere i dati di un utente nel DB di
// un altro che apre l'app nello stesso browser.
const OWNER_KEY = 'fitpulse-giornate-owner'
export function loadGiornateOwner() {
  return localStorage.getItem(OWNER_KEY) || null
}
export function saveGiornateOwner(userId) {
  if (userId) localStorage.setItem(OWNER_KEY, userId)
  else localStorage.removeItem(OWNER_KEY)
}

// Obiettivo: quanti allenamenti (giornate completate) l'utente vuole fare a settimana.
const WEEKLY_GOAL_KEY = 'fitpulse-weekly-goal'
export const DEFAULT_WEEKLY_GOAL = 4

export function loadWeeklyGoal() {
  const n = parseInt(localStorage.getItem(WEEKLY_GOAL_KEY), 10)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_WEEKLY_GOAL
}
export function saveWeeklyGoal(n) {
  localStorage.setItem(WEEKLY_GOAL_KEY, String(n))
}
