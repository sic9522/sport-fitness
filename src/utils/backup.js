// Backup/ripristino dei dati locali dell'app (tutte le chiavi localStorage con
// prefisso `fitpulse-`: giornate, diario, obiettivi, tema, lingua, timer...).
// Lo storage e' iniettabile per rendere le funzioni testabili senza DOM.

const PREFIX = 'fitpulse-'
export const BACKUP_VERSION = 1

// Elenca le chiavi `fitpulse-*` presenti nello storage.
function fitpulseKeys(storage) {
  const keys = []
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i)
    if (k && k.startsWith(PREFIX)) keys.push(k)
  }
  return keys
}

// Costruisce l'oggetto di backup { version, exportedAt, data:{ chiave: valore } }.
// exportedAt va passato dall'esterno (niente new Date() qui: resta puro/testabile).
export function buildBackup(storage = localStorage, exportedAt = null) {
  const data = {}
  for (const k of fitpulseKeys(storage)) data[k] = storage.getItem(k)
  return { version: BACKUP_VERSION, exportedAt, data }
}

// true se `obj` ha la forma attesa di un backup FitPulse.
export function isValidBackup(obj) {
  return Boolean(obj && typeof obj === 'object' && obj.data && typeof obj.data === 'object')
}

// Applica un backup: rimuove le chiavi `fitpulse-*` correnti e riscrive quelle del
// backup. Ritorna il numero di chiavi ripristinate. Lancia se il backup non e' valido.
export function applyBackup(obj, storage = localStorage) {
  if (!isValidBackup(obj)) throw new Error('Backup non valido')
  for (const k of fitpulseKeys(storage)) storage.removeItem(k)
  const entries = Object.entries(obj.data)
  for (const [k, v] of entries) {
    if (k.startsWith(PREFIX) && typeof v === 'string') storage.setItem(k, v)
  }
  return entries.length
}
