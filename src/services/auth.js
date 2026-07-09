import { supabase } from '../lib/supabaseClient'

// Wrapper unico su Supabase Auth. Tutte le funzioni ritornano { data, error }
// come le API Supabase, cosi' i componenti gestiscono l'errore in modo uniforme.
function client() {
  if (!supabase) throw new Error('Supabase non configurato')
  return supabase
}

export function signInWithEmail(email, password) {
  return client().auth.signInWithPassword({ email: email.trim(), password })
}

export function signUpWithEmail(email, password, meta = {}) {
  return client().auth.signUp({
    email: email.trim(),
    password,
    options: { data: meta },
  })
}

// OAuth (Google, e in futuro altri provider). Redirect verso l'app al ritorno.
export function signInWithProvider(providerId) {
  return client().auth.signInWithOAuth({
    provider: providerId,
    options: { redirectTo: window.location.origin },
  })
}

export function signOut() {
  return client().auth.signOut()
}
