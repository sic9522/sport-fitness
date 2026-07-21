// Helper di data condivisi dai moduli dati più recenti (idratazione, log allenamenti).
// La chiave giorno è 'YYYY-MM-DD' in fuso LOCALE, mai UTC: a cavallo di mezzanotte
// l'UTC sposterebbe la voce sul giorno sbagliato.
// NB: i moduli più vecchi hanno copie equivalenti (nutritionDefaults.dateKey,
// weightDefaults.todayISO); non sono stati toccati per non allargare il diff.

export function dayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Impuro (legge l'orologio): a livello di modulo per tenere new Date() fuori dai componenti.
export const todayKey = () => dayKey(new Date())

// Giorni del mese (month 1-12). Il giorno 0 del mese successivo è l'ultimo di questo,
// quindi gli anni bisestili vengono gestiti dal calendario, non da una tabella a mano.
export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

// Riporta il giorno dentro il mese: scegliendo il 31 e poi febbraio si finirebbe fuori.
export function clampDay(year, month, day) {
  return Math.min(Math.max(1, day), daysInMonth(year, month))
}

const pad = n => String(n).padStart(2, '0')

// (2026, 7, 5) → '2026-07-05'
export function toISODate(year, month, day) {
  return `${year}-${pad(month)}-${pad(clampDay(year, month, day))}`
}

// '2026-07-05' → { year, month, day }. Null se la stringa non è una data valida.
export function fromISODate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''))
  if (!m) return null
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null
  return { year, month, day }
}

// Intervallo di anni sensato per una data di NASCITA: da 110 anni fa a 5 anni fa.
// Impuro (legge l'anno corrente): a livello di modulo, fuori dai componenti.
export const birthYearRange = (() => {
  const y = new Date().getFullYear()
  return { from: y - 110, to: y - 5 }
})()

// Chiavi degli ultimi `n` giorni fino a `end` incluso, dal più vecchio al più recente.
// Serve ai grafici a barre (activity trend) e alle medie su finestra mobile.
export function lastDayKeys(n, end = new Date()) {
  const keys = []
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    keys.push(dayKey(d))
  }
  return keys
}
