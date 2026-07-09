import { supabase } from '../lib/supabaseClient'

// Gestione del profilo utente su public.profiles.
// I dati del wizard vengono raccolti PRIMA dell'autenticazione: si salvano in
// sospeso (localStorage) e si scrivono sul profilo appena l'utente e' autenticato
// (vale per email immediata, conferma-email e redirect OAuth Google).

const PENDING_KEY = 'fitpulse-pending-profile'

export function savePendingProfile(data) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(data)) } catch { /* quota */ }
}

export function loadPendingProfile() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || 'null') } catch { return null }
}

export function clearPendingProfile() {
  localStorage.removeItem(PENDING_KEY)
}

// Mappa i dati del wizard alle colonne di profiles (+ details jsonb per i futuri).
function toProfileRow(userId, data) {
  const a = data.anagrafica || {}
  const f = data.fisico || {}
  const displayName = [a.firstName, a.lastName].map(s => (s || '').trim()).filter(Boolean).join(' ')
  return {
    id: userId,
    first_name: a.firstName?.trim() || null,
    last_name: a.lastName?.trim() || null,
    birth_date: a.birthDate || null,
    phone: a.phone?.trim() || null,
    city: a.city?.trim() || null,
    address: a.address?.trim() || null,
    postal_code: a.postalCode?.trim() || null,
    height_cm: f.height ? Number(f.height) : null,
    weight_kg: f.weight ? Number(f.weight) : null,
    display_name: displayName || null,
    details: data.details || {},
  }
}

export async function upsertProfile(userId, data) {
  if (!supabase) return
  const { error } = await supabase.from('profiles').upsert(toProfileRow(userId, data), { onConflict: 'id' })
  if (error) throw error
}

export async function getProfile(userId) {
  if (!supabase) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

// Scrive i dati in sospeso sul profilo dell'utente appena autenticato.
export async function flushPendingProfile(user) {
  const pending = loadPendingProfile()
  if (!pending || !user) return
  try {
    await upsertProfile(user.id, pending)
    clearPendingProfile()
  } catch {
    // riproveremo al prossimo cambio di stato auth
  }
}
