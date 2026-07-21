// Proprietario dei dati locali di Statistiche (idratazione + allenamenti svolti):
// userId Supabase se già riconciliati con un account, oppure null = dati "anonimi",
// creati senza login. Speculare a loadDiarioOwner in nutritionDefaults.
//
// Serve al ponte di sync (hooks/useInsightsSync) per non spingere nel DB di un utente
// i dati creati da un altro che ha usato lo stesso browser. Un unico marcatore governa
// entrambi i tracker, perché vengono riconciliati insieme.
const KEY = 'fitpulse-insights-owner'

export function loadInsightsOwner() {
  return localStorage.getItem(KEY) || null
}

export function saveInsightsOwner(userId) {
  if (userId) localStorage.setItem(KEY, userId)
  else localStorage.removeItem(KEY)
}
