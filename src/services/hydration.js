import { supabase } from '../lib/supabaseClient'

// Ponte tra il tracker locale (data/hydrationDefaults) e le tabelle Supabase
// `public.hydration_days` + `public.hydration_goals` (migrazione 20260721110000_hydration.sql).
// Forma locale: { 'YYYY-MM-DD': ml }. Una riga per giorno, chiave (user_id, day).

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

// Legge i giorni dell'utente loggato (RLS filtra da sé) nella forma dello store locale.
export async function fetchHydration() {
  const client = requireSupabase()
  const { data, error } = await client.from('hydration_days').select('day, ml')
  if (error) throw error

  const store = {}
  for (const row of data || []) {
    const ml = Number(row.ml)
    if (Number.isFinite(ml) && ml > 0) store[row.day] = ml
  }
  return store
}

// Full-replace dei giorni, come replaceDiary: cancella e reinserisce solo i giorni con
// un valore reale. I volumi in gioco sono minuscoli (una riga per giorno vissuto).
export async function replaceHydration(userId, store) {
  const client = requireSupabase()

  const { error: deleteError } = await client.from('hydration_days').delete().eq('user_id', userId)
  if (deleteError) throw deleteError

  const rows = Object.entries(store || {})
    .map(([day, ml]) => ({ user_id: userId, day, ml: Math.round(Number(ml) || 0) }))
    .filter(r => r.ml > 0)

  if (!rows.length) return
  const { error } = await client.from('hydration_days').insert(rows)
  if (error) throw error
}

// --- Obiettivo giornaliero (una riga per utente). Forma locale: numero in ml.

export async function fetchHydrationGoal() {
  const client = requireSupabase()
  const { data, error } = await client
    .from('hydration_goals')
    .select('goal_ml')
    .maybeSingle() // RLS filtra sull'utente; PK user_id → al massimo una riga
  if (error) throw error
  return data ? Number(data.goal_ml) : null
}

export async function upsertHydrationGoal(userId, goalMl) {
  const client = requireSupabase()
  const { error } = await client
    .from('hydration_goals')
    .upsert({ user_id: userId, goal_ml: Math.round(Number(goalMl) || 0) }, { onConflict: 'user_id' })
  if (error) throw error
}
