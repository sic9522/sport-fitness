// Schede di allenamento reali, persistite in localStorage.
// Gli esercizi arriveranno dopo: per ora ogni scheda ha solo nome + array vuoto.
const KEY = 'fitpulse-schede'

export const DEFAULT_SCHEDE = [
  { id: 'push', nome: 'Push Day', esercizi: [] },
  { id: 'leg', nome: 'Leg Day', esercizi: [] },
]

export function loadSchede() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (Array.isArray(saved)) return saved // include l'array vuoto (tutte eliminate)
  } catch {
    // dato corrotto → riparto dai default
  }
  return DEFAULT_SCHEDE
}

export function saveSchede(schede) {
  localStorage.setItem(KEY, JSON.stringify(schede))
}
