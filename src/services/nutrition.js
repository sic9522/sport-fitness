import { supabase } from '../lib/supabaseClient'

// Ponte tra il diario locale (data/nutritionDefaults) e le tabelle Supabase
// `public.meal_logs` + `public.meal_entries` (create nella migrazione
// 20260708170000_catalogs_and_nutrition.sql). Il diario e' un oggetto
// { "YYYY-MM-DD": { breakfast:[], lunch:[], dinner:[], snacks:[] } }.

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

// Il frontend usa `snacks` (plurale), il DB il valore singolare `snack`.
const MEAL_TYPE = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', snacks: 'snack' }
const FRONT_MEAL = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', snack: 'snacks' }
const FRONT_MEALS = ['breakfast', 'lunch', 'dinner', 'snacks']

const emptyDay = () => ({ breakfast: [], lunch: [], dinner: [], snacks: [] })

// Numeri come stringhe nel modello UI: null → '' (campo lasciato vuoto).
const numToStr = v => (v === null || v === undefined ? '' : String(v))
// Stringa UI → numero DB: '' o non numerico → null (colonne nullable).
function strToNum(v) {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

function foodFromEntry(row) {
  return {
    id: row.id,
    nome: row.name,
    grammi: row.quantity ? String(row.quantity) : '',
    kcal: numToStr(row.calories_kcal),
    protein: numToStr(row.protein_g),
    carbs: numToStr(row.carbs_g),
    fat: numToStr(row.fat_g),
  }
}

// Legge il diario dell'utente loggato e lo ricompone nella forma UI.
export async function fetchDiary() {
  const client = requireSupabase()
  const { data, error } = await client
    .from('meal_logs')
    .select(`
      id,
      log_date,
      meal_type,
      meal_entries (
        id,
        name,
        quantity,
        calories_kcal,
        protein_g,
        carbs_g,
        fat_g,
        sort_order
      )
    `)

  if (error) throw error

  const diario = {}
  for (const log of data || []) {
    const meal = FRONT_MEAL[log.meal_type]
    if (!meal) continue // 'other' o valori non usati dalla UI: ignorati
    if (!diario[log.log_date]) diario[log.log_date] = emptyDay()
    diario[log.log_date][meal] = (log.meal_entries || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(foodFromEntry)
  }
  return diario
}

// Full-replace del diario: cancella tutti i meal_logs dell'utente (cascade sulle
// entry) e reinserisce solo i pasti che contengono alimenti. Stesso approccio di
// replaceWorkoutDays: semplice e robusto ai numeri in gioco per un diario.
export async function replaceDiary(userId, diario) {
  const client = requireSupabase()

  const { error: deleteError } = await client
    .from('meal_logs')
    .delete()
    .eq('user_id', userId)

  if (deleteError) throw deleteError

  for (const logDate of Object.keys(diario || {})) {
    const meals = diario[logDate] || {}
    for (const meal of FRONT_MEALS) {
      const foods = meals[meal] || []
      if (!foods.length) continue

      const { data: logRow, error: logError } = await client
        .from('meal_logs')
        .insert({ user_id: userId, log_date: logDate, meal_type: MEAL_TYPE[meal] })
        .select('id')
        .single()

      if (logError) throw logError

      const entries = foods.map((food, index) => ({
        id: food.id,
        meal_log_id: logRow.id,
        name: food.nome,
        quantity: Number(food.grammi) || 0,
        unit: 'g',
        calories_kcal: strToNum(food.kcal),
        protein_g: strToNum(food.protein),
        carbs_g: strToNum(food.carbs),
        fat_g: strToNum(food.fat),
        sort_order: index,
      }))

      const { error: entriesError } = await client.from('meal_entries').insert(entries)
      if (entriesError) throw entriesError
    }
  }
}

// --- Obiettivi nutrizionali (tabella public.nutrition_goals, una riga per utente).
// Forma UI: { kcal, protein, carbs, fat } (numeri). Colonne DB: kcal + *_g.

export async function fetchGoals() {
  const client = requireSupabase()
  const { data, error } = await client
    .from('nutrition_goals')
    .select('kcal, protein_g, carbs_g, fat_g')
    .maybeSingle() // RLS filtra sull'utente; PK user_id → al massimo una riga

  if (error) throw error
  if (!data) return null
  return {
    kcal: Number(data.kcal),
    protein: Number(data.protein_g),
    carbs: Number(data.carbs_g),
    fat: Number(data.fat_g),
  }
}

export async function upsertGoals(userId, goals) {
  const client = requireSupabase()
  const { error } = await client
    .from('nutrition_goals')
    .upsert(
      {
        user_id: userId,
        kcal: Number(goals.kcal) || 0,
        protein_g: Number(goals.protein) || 0,
        carbs_g: Number(goals.carbs) || 0,
        fat_g: Number(goals.fat) || 0,
      },
      { onConflict: 'user_id' },
    )

  if (error) throw error
}
