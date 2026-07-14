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
  { key: 'fat', shortKey: 'nutrition.fatShort', color: '#38bdf8' },
  { key: 'sugars', shortKey: 'nutrition.sugarsShort', color: '#a78bfa' },
  { key: 'fiber', shortKey: 'nutrition.fiberShort', color: '#34d399' },
]
export const MACRO_KEYS = MACROS.map(m => m.key)

export const DEFAULT_NUTRITION_GOALS = {
  kcal: 2000, protein: 150, carbs: 220, fat: 60, sugars: 50, fiber: 30,
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

// Lunedì della settimana che contiene `d` (fuso locale, orario azzerato).
export function startOfWeek(d) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = (r.getDay() + 6) % 7 // lun=0 … dom=6
  r.setDate(r.getDate() - dow)
  return r
}

// Settimana (lun→dom) di `d` RITAGLIATA al mese: non sconfina nel mese vicino.
// Es: se la settimana inizia il 28 e il mese finisce il 30 → 28→30; la successiva
// riparte dal giorno 1 del mese dopo. `start`/`end` a mezzanotte.
export function clippedWeek(d) {
  const first = new Date(d.getFullYear(), d.getMonth(), 1)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  let start = startOfWeek(d)
  let end = addDays(start, 6)
  if (start < first) start = first
  if (end > last) end = last
  return { start, end }
}

// Chiavi-giorno della settimana di `d`, ritagliate al mese (da 1 a 7 giorni).
export function weekDateKeys(d) {
  const { start, end } = clippedWeek(d)
  const days = Math.round((end - start) / 86400000) + 1
  return Array.from({ length: days }, (_, i) => dateKey(addDays(start, i)))
}

// Numero della settimana nel mese (1-based, settimane lun→dom ritagliate al mese;
// la 1ª contiene il giorno 1). Es: 13 lug 2026 → 3. Riparte da 1 ogni mese.
export function weekOfMonth(d) {
  const firstDow = (new Date(d.getFullYear(), d.getMonth(), 1).getDay() + 6) % 7
  return Math.ceil((d.getDate() + firstDow) / 7)
}

// Le chiavi-giorno di tutti i giorni del mese di `d`.
export function monthDateKeys(d) {
  const y = d.getFullYear()
  const m = d.getMonth()
  const days = new Date(y, m + 1, 0).getDate()
  return Array.from({ length: days }, (_, i) => dateKey(new Date(y, m, i + 1)))
}

// Le settimane (ritagliate al mese) che compongono il mese di `d`, in ordine.
// Ognuna { start, end } (Date a mezzanotte). Numero variabile (4-6).
export function monthWeeks(d) {
  const y = d.getFullYear()
  const m = d.getMonth()
  const lastDay = new Date(y, m + 1, 0).getDate()
  const weeks = []
  let day = 1
  while (day <= lastDay) {
    const { start, end } = clippedWeek(new Date(y, m, day))
    weeks.push({ start, end })
    day = end.getDate() + 1
  }
  return weeks
}

// Totali nutrienti su un insieme di chiavi-giorno.
export function rangeTotals(diario, keys) {
  return sumNutrients(keys.flatMap(k => dayFoods(dayMeals(diario, k))))
}

// Serie delle kcal giornaliere sull'insieme di chiavi (per il grafico mensile).
export function dailyKcalSeries(diario, keys) {
  return keys.map(k => dayTotals(dayMeals(diario, k)).kcal)
}

// Serie del DEFICIT kcal giornaliero (obiettivo − consumato) sull'insieme di chiavi.
// Giorni senza alimenti → 0 (nessun deficit/surplus). Positivo = deficit (sotto
// l'obiettivo), negativo = surplus. Base del grafico ad andamento fluttuante.
export function dailyDeficitSeries(diario, keys, goalKcal) {
  return keys.map(k => {
    const kcal = dayTotals(dayMeals(diario, k)).kcal
    return kcal > 0 ? (goalKcal || 0) - kcal : 0
  })
}
