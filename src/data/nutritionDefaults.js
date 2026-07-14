// Diario alimentare + obiettivi nutrizionali giornalieri, persistiti in localStorage.
// Local-first come il resto dell'app (il ponte cloud arrivera' come per Palestra).
// Gerarchia: diario → giorno (YYYY-MM-DD) → 4 pasti → alimenti.
// Alimento = { id, nome, grammi, kcal, protein, carbs, fat } (valori numerici come stringhe).
const DIARY_KEY = 'fitpulse-diario'
const GOALS_KEY = 'fitpulse-nutrition-goals'

// Pasti del giorno, in ordine di visualizzazione.
export const MEALS = [
  { key: 'breakfast', labelKey: 'nutrition.breakfast' },
  { key: 'lunch', labelKey: 'nutrition.lunch' },
  { key: 'dinner', labelKey: 'nutrition.dinner' },
  { key: 'snacks', labelKey: 'nutrition.snacks' },
]

// Macro-nutrienti tracciati per alimento e mostrati nell'accordion (ordine = UI).
// key = campo nell'alimento/obiettivi; shortKey = etichetta i18n; color = barra.
export const MACROS = [
  { key: 'protein', shortKey: 'nutrition.proteinShort', color: '#f472b6' },
  { key: 'carbs', shortKey: 'nutrition.carbsShort', color: '#f59e0b' },
  { key: 'satFat', shortKey: 'nutrition.satFatShort', color: '#38bdf8' },
  { key: 'unsatFat', shortKey: 'nutrition.unsatFatShort', color: '#22d3ee' },
  { key: 'sugars', shortKey: 'nutrition.sugarsShort', color: '#a78bfa' },
  { key: 'fiber', shortKey: 'nutrition.fiberShort', color: '#34d399' },
]
export const MACRO_KEYS = MACROS.map(m => m.key)

export const DEFAULT_NUTRITION_GOALS = {
  kcal: 2000, protein: 150, carbs: 220, satFat: 20, unsatFat: 40, sugars: 50, fiber: 30,
}

// --- Date (helper impuri a livello di modulo: tengono new Date fuori dai componenti,
// come newId in giornateDefaults, per non far scattare react-hooks/purity). ---
export const todayDate = () => new Date()
export const addDays = (d, n) => {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
// Chiave giorno YYYY-MM-DD in fuso LOCALE (non UTC, per non sballare a cavallo di mezzanotte).
export function dateKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
export const todayKey = () => dateKey(new Date())

export const newFoodId = () => (crypto?.randomUUID && crypto.randomUUID()) || String(Date.now())

// Un giorno vuoto = le 4 liste pasto vuote.
const emptyDay = () => ({ breakfast: [], lunch: [], dinner: [], snacks: [] })

export function loadDiario() {
  try {
    const saved = JSON.parse(localStorage.getItem(DIARY_KEY) || 'null')
    if (saved && typeof saved === 'object') return saved
  } catch {
    // dato corrotto → diario vuoto
  }
  return {}
}
export function saveDiario(diario) {
  localStorage.setItem(DIARY_KEY, JSON.stringify(diario))
}

// Pasti di un giorno: sempre le 4 liste, anche se il giorno non esiste ancora.
export function dayMeals(diario, key) {
  return { ...emptyDay(), ...(diario[key] || {}) }
}

export function loadNutritionGoals() {
  try {
    const saved = JSON.parse(localStorage.getItem(GOALS_KEY) || 'null')
    if (saved && typeof saved === 'object') return { ...DEFAULT_NUTRITION_GOALS, ...saved }
  } catch {
    // corrotto → default
  }
  return DEFAULT_NUTRITION_GOALS
}
export function saveNutritionGoals(goals) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals))
}

// Proprietario del diario locale: userId Supabase se riconciliato con un account,
// oppure null = dati "anonimi" (creati senza login). Usato dal ponte cloud
// (useNutritionSync) per non spingere il diario di un utente nel DB di un altro
// che apre l'app nello stesso browser. Speculare a loadGiornateOwner.
const OWNER_KEY = 'fitpulse-diario-owner'
export function loadDiarioOwner() {
  return localStorage.getItem(OWNER_KEY) || null
}
export function saveDiarioOwner(userId) {
  if (userId) localStorage.setItem(OWNER_KEY, userId)
  else localStorage.removeItem(OWNER_KEY)
}

// true se il diario contiene almeno un alimento (una chiave-giorno con liste
// pasto vuote NON conta come "ha dati": conta solo il contenuto reale).
export function diarioHasData(diario) {
  return Object.values(diario || {}).some(day =>
    ['breakfast', 'lunch', 'dinner', 'snacks'].some(meal => (day?.[meal] || []).length > 0),
  )
}

// Somma i nutrienti di una lista di alimenti (stringhe → numeri, vuoto = 0).
// Ritorna { kcal, ...MACRO_KEYS }.
export function sumNutrients(foods) {
  const acc = { kcal: 0 }
  for (const k of MACRO_KEYS) acc[k] = 0
  for (const f of foods) {
    acc.kcal += Number(f.kcal) || 0
    for (const k of MACRO_KEYS) acc[k] += Number(f[k]) || 0
  }
  return acc
}

// Alimenti di un giorno appiattiti (tutti i pasti).
function dayFoods(meals) {
  return [...meals.breakfast, ...meals.lunch, ...meals.dinner, ...meals.snacks]
}

// Totali dell'intero giorno (tutti i pasti insieme).
export function dayTotals(meals) {
  return sumNutrients(dayFoods(meals))
}

// --- Aggregazione per periodo (tab Settimanale / Mensile) ---

// Lunedì della settimana che contiene `d` (fuso locale).
export function startOfWeek(d) {
  const r = new Date(d)
  const dow = (r.getDay() + 6) % 7 // lun=0 … dom=6
  r.setDate(r.getDate() - dow)
  return r
}

// Le 7 chiavi-giorno (lun→dom) della settimana di `d`.
export function weekDateKeys(d) {
  const start = startOfWeek(d)
  return Array.from({ length: 7 }, (_, i) => dateKey(addDays(start, i)))
}

// Le chiavi-giorno di tutti i giorni del mese di `d`.
export function monthDateKeys(d) {
  const y = d.getFullYear()
  const m = d.getMonth()
  const days = new Date(y, m + 1, 0).getDate()
  return Array.from({ length: days }, (_, i) => dateKey(new Date(y, m, i + 1)))
}

// Totali nutrienti su un insieme di chiavi-giorno.
export function rangeTotals(diario, keys) {
  return sumNutrients(keys.flatMap(k => dayFoods(dayMeals(diario, k))))
}

// Serie delle kcal giornaliere sull'insieme di chiavi (per il grafico mensile).
export function dailyKcalSeries(diario, keys) {
  return keys.map(k => dayTotals(dayMeals(diario, k)).kcal)
}
