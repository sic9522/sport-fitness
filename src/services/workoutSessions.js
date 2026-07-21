import { supabase } from '../lib/supabaseClient'

// Ponte tra il registro locale degli allenamenti svolti (data/workoutLog) e la tabella
// `public.workout_sessions` (migrazione 20260721120000_workout_sessions.sql).
// Forma locale: { id, date: 'YYYY-MM-DD', nome, durationMin, exercises }.

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

const toLocal = row => ({
  id: row.id,
  date: row.day,
  nome: row.nome || '',
  durationMin: Number(row.duration_min) || 0,
  exercises: Number(row.exercises) || 0,
})

const toRow = (userId, s) => ({
  id: s.id,
  user_id: userId,
  day: s.date,
  nome: s.nome || null,
  duration_min: Math.max(0, Number(s.durationMin) || 0),
  exercises: Math.max(0, Number(s.exercises) || 0),
})

export async function fetchSessions() {
  const client = requireSupabase()
  const { data, error } = await client
    .from('workout_sessions')
    .select('id, day, nome, duration_min, exercises')
    .order('day', { ascending: false })
  if (error) throw error
  return (data || []).map(toLocal)
}

// Full-replace, come per diario e idratazione: il registro è piccolo (una riga per
// allenamento svolto) e questo evita di dover riconciliare le cancellazioni.
export async function replaceSessions(userId, log) {
  const client = requireSupabase()

  const { error: deleteError } = await client.from('workout_sessions').delete().eq('user_id', userId)
  if (deleteError) throw deleteError

  const rows = (log || []).filter(s => s?.id && s?.date).map(s => toRow(userId, s))
  if (!rows.length) return
  const { error } = await client.from('workout_sessions').insert(rows)
  if (error) throw error
}

// Spinge SUBITO una singola sessione appena conclusa. Serve perché l'allenamento si
// registra dalla scheda (Palestra) mentre il mirror completo vive nella pagina
// Statistiche: senza questo, una sessione registrata e mai seguita da una visita a
// Statistiche resterebbe solo sul dispositivo. Upsert per id → nessun doppione quando
// poi il mirror completo riscrive tutto.
export async function pushSession(userId, session) {
  const client = requireSupabase()
  const { error } = await client
    .from('workout_sessions')
    .upsert(toRow(userId, session), { onConflict: 'id' })
  if (error) throw error
}
