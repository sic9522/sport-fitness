import { supabase } from '../lib/supabaseClient'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

// Ricerca fuzzy e multilingua via RPC Postgres search_catalog_exercises:
// matcha su tutte le lingue (it/en/es/fr/zh) con tolleranza ai refusi e
// restituisce il nome nella lingua `locale` (fallback italiano). Vedi le
// migrazioni 20260709120000_fuzzy_exercise_search / 20260709130000_exercise_i18n.
export async function searchCatalogExercises(query, { limit = 20, locale = 'it' } = {}) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('search_catalog_exercises', {
    search: query ?? '',
    p_locale: locale,
    max_results: limit,
  })
  if (error) throw error
  return data || []
}

export async function searchFoodItems(query, { limit = 20 } = {}) {
  const client = requireSupabase()
  let request = client
    .from('food_items')
    .select('id, source, source_id, name, brand, barcode, serving_size, serving_unit, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, salt_g')
    .order('name', { ascending: true })
    .limit(limit)

  const q = query?.trim()
  if (q) request = request.ilike('name', `%${q}%`)

  const { data, error } = await request
  if (error) throw error
  return data || []
}

export async function getFoodItemByBarcode(barcode) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('food_items')
    .select('id, source, source_id, name, brand, barcode, serving_size, serving_unit, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, salt_g')
    .eq('barcode', barcode)
    .maybeSingle()

  if (error) throw error
  return data
}
