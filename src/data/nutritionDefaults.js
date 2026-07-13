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

export const DEFAULT_NUTRITION_GOALS = { kcal: 2000, protein: 150, carbs: 220, fat: 60 }

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

// Somma i nutrienti di una lista di alimenti (stringhe → numeri, vuoto = 0).
export function sumNutrients(foods) {
  return foods.reduce(
    (acc, f) => ({
      kcal: acc.kcal + (Number(f.kcal) || 0),
      protein: acc.protein + (Number(f.protein) || 0),
      carbs: acc.carbs + (Number(f.carbs) || 0),
      fat: acc.fat + (Number(f.fat) || 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

// Totali dell'intero giorno (tutti i pasti insieme).
export function dayTotals(meals) {
  return sumNutrients([...meals.breakfast, ...meals.lunch, ...meals.dinner, ...meals.snacks])
}
