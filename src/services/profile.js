import { supabase } from '../lib/supabaseClient'
import { identityFromUser } from '../utils/greeting'

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

// Scrive i dati in sospeso sul profilo dell'utente appena autenticato, poi completa i
// campi ancora vuoti con quanto offre l'identita' del provider.
export async function flushPendingProfile(user) {
  if (!user) return
  const pending = loadPendingProfile()
  try {
    if (pending) {
      await upsertProfile(user.id, pending)
      clearPendingProfile()
    }
    await fillFromIdentity(user)
  } catch {
    // riproveremo al prossimo cambio di stato auth
  }
}

// Precompila il profilo con i dati dell'account del provider (con Google: nome, cognome
// e foto; data di nascita, telefono e indirizzo NON vengono forniti e restano da
// chiedere all'utente).
// Riempie SOLO le caselle vuote: quanto l'utente ha scritto a mano non si tocca mai,
// nemmeno al login successivo. Cosi' l'autocompilazione fa risparmiare digitazione senza
// mai sovrascrivere una correzione.
export async function fillFromIdentity(user) {
  if (!supabase || !user) return
  const id = identityFromUser(user)
  if (!id.firstName && !id.lastName && !id.fullName && !id.avatarUrl) return

  const current = await getProfile(user.id)
  const parts = id.fullName ? id.fullName.split(/\s+/) : []
  const patch = {}
  const setIfEmpty = (col, value) => {
    if (value && !(current?.[col] || '').trim()) patch[col] = value
  }
  setIfEmpty('first_name', id.firstName || parts[0] || '')
  setIfEmpty('last_name', id.lastName || parts.slice(1).join(' ') || '')
  setIfEmpty('display_name', id.fullName || [id.firstName, id.lastName].filter(Boolean).join(' '))
  setIfEmpty('avatar_url', id.avatarUrl)

  if (!Object.keys(patch).length) return
  const { error } = await supabase.from('profiles').upsert({ id: user.id, ...patch }, { onConflict: 'id' })
  if (error) throw error
}

// Aggiorna i dati anagrafici modificati dall'utente. A differenza di upsertProfile
// (che mappa la forma del wizard) accetta direttamente le colonne, e le stringhe vuote
// diventano null per non lasciare "" nel database.
export async function updateProfileFields(userId, fields) {
  if (!supabase) return
  const clean = {}
  for (const [k, v] of Object.entries(fields)) {
    clean[k] = typeof v === 'string' ? (v.trim() || null) : (v ?? null)
  }
  const { error } = await supabase.from('profiles').upsert({ id: userId, ...clean }, { onConflict: 'id' })
  if (error) throw error
}
