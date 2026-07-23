import { supabase } from '../lib/supabaseClient'

// Specchio su Supabase dei prodotti nascosti (tabella public.hidden_food_items,
// migrazione 20260723170000). La RLS filtra per utente: le query non devono
// nemmeno passare lo user_id in lettura, ma in scrittura sì — è la colonna su cui
// la policy verifica che uno stia scrivendo roba propria.
function client() {
  if (!supabase) throw new Error('Supabase non configurato')
  return supabase
}

export async function fetchHiddenFoods() {
  const { data, error } = await client().from('hidden_food_items').select('food_id')
  if (error) throw error
  return (data || []).map(r => r.food_id)
}

// `ignoreDuplicates`: nascondere due volte lo stesso prodotto non è un errore da
// mostrare all'utente, è un no-op.
export async function pushHiddenFoods(userId, foodIds) {
  if (!userId || !foodIds?.length) return
  const rows = foodIds.map(id => ({ user_id: userId, food_id: id }))
  const { error } = await client()
    .from('hidden_food_items')
    .upsert(rows, { onConflict: 'user_id,food_id', ignoreDuplicates: true })
  if (error) throw error
}

export async function clearHiddenFoods(userId) {
  if (!userId) return
  const { error } = await client().from('hidden_food_items').delete().eq('user_id', userId)
  if (error) throw error
}
