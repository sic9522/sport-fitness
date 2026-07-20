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
