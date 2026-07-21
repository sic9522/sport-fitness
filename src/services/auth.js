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

// OAuth (Google, e in futuro altri provider). Al ritorno si rientra nell'app.
// `path` permette di tornare su una pagina precisa: la registrazione lo usa per
// riprendere il wizard e chiedere i soli dati che il provider non fornisce.
export function signInWithProvider(providerId, path = '/') {
  return client().auth.signInWithOAuth({
    provider: providerId,
    options: { redirectTo: new URL(path, window.location.origin).toString() },
  })
}

export function signOut() {
  return client().auth.signOut()
}
