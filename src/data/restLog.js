// Registro dei recuperi COMPLETATI, cioè quelli arrivati davvero a zero.
// Alimenta la card "Ultimi recuperi" della schermata Recupero: senza questo il mockup
// avrebbe richiesto di inventare tre righe di storico.
// Voce = { id, seconds, at } dove `at` è l'istante di completamento (epoch ms).
const KEY = 'fitpulse-rest-log'
const MAX = 5 // ne servono pochi: è un promemoria, non uno storico

export const newRestId = () => (crypto?.randomUUID && crypto.randomUUID()) || String(Date.now())

export function loadRestLog() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (Array.isArray(saved)) return saved
  } catch {
    // dato corrotto → registro vuoto
  }
  return []
}

export function saveRestLog(log) {
  localStorage.setItem(KEY, JSON.stringify(log))
}

// --- Funzioni PURE (testate). ---

// Aggiunge in testa (il più recente per primo) e tiene solo le ultime MAX voci.
// Le durate non valide vengono ignorate: meglio nessuna riga che una riga a zero.
export function addRest(log, entry) {
  const seconds = Math.round(Number(entry?.seconds) || 0)
  if (seconds <= 0) return Array.isArray(log) ? log : []
  const clean = { id: entry.id || String(entry.at), seconds, at: Number(entry.at) || 0 }
  return [clean, ...(Array.isArray(log) ? log : [])].slice(0, MAX)
}

// mm:ss, come il display del timer.
export function formatRest(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
