// Misure corporee dettagliate (composizione + circonferenze), local-first.
// Snapshot datato: ogni voce puo' compilare solo alcuni campi.
// Voce = { id, date: 'YYYY-MM-DD', values: { [field]: number } }.
// NB: sezione predisposta ma non ancora esposta in UI (vedi config/features.js).
// Questi dati serviranno a gestire meglio peso, palestra e alimentazione.
import { todayISO } from './weightDefaults'

const KEY = 'fitpulse-body-measures'

export { todayISO }
export { newId as newMeasureId } from './ids'

// Gruppi e campi delle misure. Iterati da editor e pagina: aggiungere un campo =
// una riga qui + la relativa chiave i18n `body.field.*`.
export const MEASURE_GROUPS = [
  { key: 'composition', labelKey: 'body.group.composition' },
  { key: 'circumference', labelKey: 'body.group.circumference' },
]

export const MEASURE_FIELDS = [
  { key: 'leanMass', labelKey: 'body.field.leanMass', unit: 'kg', group: 'composition' },
  { key: 'fatMass', labelKey: 'body.field.fatMass', unit: 'kg', group: 'composition' },
  { key: 'bodyFatPct', labelKey: 'body.field.bodyFatPct', unit: '%', group: 'composition' },
  { key: 'muscleMass', labelKey: 'body.field.muscleMass', unit: 'kg', group: 'composition' },
  { key: 'waterPct', labelKey: 'body.field.waterPct', unit: '%', group: 'composition' },
  { key: 'waist', labelKey: 'body.field.waist', unit: 'cm', group: 'circumference' },
  { key: 'hips', labelKey: 'body.field.hips', unit: 'cm', group: 'circumference' },
  { key: 'chest', labelKey: 'body.field.chest', unit: 'cm', group: 'circumference' },
  { key: 'arm', labelKey: 'body.field.arm', unit: 'cm', group: 'circumference' },
  { key: 'thigh', labelKey: 'body.field.thigh', unit: 'cm', group: 'circumference' },
  { key: 'calf', labelKey: 'body.field.calf', unit: 'cm', group: 'circumference' },
  { key: 'neck', labelKey: 'body.field.neck', unit: 'cm', group: 'circumference' },
]

const isSet = v => v !== undefined && v !== null && v !== ''

// true se lo snapshot ha almeno un valore compilato.
export function hasAnyValue(entry) {
  return MEASURE_FIELDS.some(f => isSet(entry.values?.[f.key]))
}

// Ripulisce i valori del form: solo i campi compilati, convertiti a numero.
export function cleanValues(rawValues) {
  const out = {}
  for (const f of MEASURE_FIELDS) {
    const v = rawValues?.[f.key]
    if (isSet(v)) out[f.key] = Number(v)
  }
  return out
}

export function sortByDate(entries) {
  return [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

// Inserisce o aggiorna per data (uno snapshot al giorno), poi riordina.
export function upsertEntry(entries, entry) {
  const others = entries.filter(e => e.id !== entry.id && e.date !== entry.date)
  return sortByDate([...others, entry])
}

export function removeEntry(entries, id) {
  return entries.filter(e => e.id !== id)
}

export function latestEntry(entries) {
  const s = sortByDate(entries)
  return s[s.length - 1] || null
}

// Per ogni campo, il valore piu' recente registrato (snapshot diversi possono
// compilare campi diversi). Ritorna { [field]: { value, date } }.
export function latestValues(entries) {
  const out = {}
  for (const e of sortByDate(entries)) { // ascendente: i piu' recenti sovrascrivono
    for (const f of MEASURE_FIELDS) {
      const v = e.values?.[f.key]
      if (isSet(v)) out[f.key] = { value: Number(v), date: e.date }
    }
  }
  return out
}

export function loadMeasures() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (Array.isArray(saved)) return sortByDate(saved)
  } catch {
    // dato corrotto → vuoto
  }
  return []
}

export function saveMeasures(entries) {
  localStorage.setItem(KEY, JSON.stringify(sortByDate(entries)))
}
