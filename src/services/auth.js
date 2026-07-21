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

// Segnala che il redirect OAuth in corso parte DAL WIZARD di registrazione. Senza questo
// non si distingue "tornato ora da Google per registrarsi" da "era gia' loggato e ha
// aperto /registrazione": nel secondo caso va detto che l'account esiste gia'.
// sessionStorage perche' deve sopravvivere al redirect ma non oltre la scheda.
const OAUTH_SIGNUP_KEY = 'fitpulse-oauth-signup'

export function markOAuthSignup() {
  try { sessionStorage.setItem(OAUTH_SIGNUP_KEY, '1') } catch { /* modalita' privata */ }
}

// Legge e CONSUMA il marcatore: va chiamata una volta sola, al montaggio del wizard.
export function consumeOAuthSignup() {
  try {
    const v = sessionStorage.getItem(OAUTH_SIGNUP_KEY)
    sessionStorage.removeItem(OAUTH_SIGNUP_KEY)
    return v === '1'
  } catch {
    return false
  }
}

// Supabase, per non rivelare quali email sono registrate, NON restituisce un errore
// quando si prova a registrare un indirizzo gia' esistente: risponde con un utente
// fittizio e la lista `identities` VUOTA. Senza questo controllo il wizard mostrerebbe
// "controlla la posta" per un account che invece esiste gia'.
export function isExistingUser(signUpData) {
  const u = signUpData?.user
  return Boolean(u && Array.isArray(u.identities) && u.identities.length === 0)
}
