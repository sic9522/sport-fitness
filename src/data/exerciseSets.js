// Gestione delle SERIE di un esercizio (1-5) con opzione "split".
// Modello esercizio (retro-compatibile):
//   { ...esercizio, serie: '<1-5>', reps, kg, split?: boolean, sets?: [{reps, kg}] }
// - split OFF (default): una sola coppia reps/kg valida per tutte le serie (come prima).
//   `reps`/`kg` restano i campi canonici (usati anche dalla card e dalla sync cloud).
// - split ON: ogni serie ha la sua riga reps/kg in `sets` (lunghezza = numero serie).
//   `reps`/`kg` rispecchiano la PRIMA serie (compatibilità card/cloud).
export const SERIE_MIN = 1
export const SERIE_MAX = 5

const clampSerie = n => {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return 3
  return Math.min(SERIE_MAX, Math.max(SERIE_MIN, v))
}

// Numero di serie di un esercizio, sempre entro 1-5.
export const serieCount = ex => clampSerie(ex?.serie)

// Righe { reps, kg } da mostrare nell'EDITOR: N righe se split, 1 riga condivisa altrimenti.
export function editorRows(ex) {
  const count = serieCount(ex)
  if (ex?.split && Array.isArray(ex.sets) && ex.sets.length) {
    const rows = ex.sets.slice(0, count).map(s => ({ reps: String(s.reps ?? ''), kg: String(s.kg ?? '') }))
    while (rows.length < count) rows.push({ reps: String(ex.reps ?? ''), kg: String(ex.kg ?? '') })
    return rows
  }
  return [{ reps: String(ex?.reps ?? ''), kg: String(ex?.kg ?? '') }]
}

// Peso da MOSTRARE: via gli zeri superflui dopo il separatore ("0.50" → "0.5",
// "30.00" → "30") e l'eventuale punto rimasto in coda. Solo formattazione: il valore
// salvato non cambia.
export function formatKg(v) {
  const s = String(v ?? '')
  if (!s.includes('.')) return s // "100" non va toccato
  return s.replace(/\.?0+$/, '').replace(/\.$/, '')
}

// true se tutte le righe hanno reps e kg compilati (e ce n'è almeno una).
export const rowsValid = rows =>
  rows.length > 0 && rows.every(r => String(r.reps).trim() !== '' && String(r.kg).trim() !== '')

// Costruisce l'esercizio da salvare a partire da stato base + selezione editor.
export function buildExercise(base, { serie, split, rows }) {
  const count = clampSerie(serie)
  const first = rows[0] || { reps: '', kg: '' }
  if (split) {
    const sets = rows.slice(0, count).map(r => ({ reps: r.reps, kg: r.kg }))
    return { ...base, serie: String(count), split: true, sets, reps: first.reps, kg: first.kg }
  }
  const next = { ...base, serie: String(count), split: false, reps: first.reps, kg: first.kg }
  delete next.sets // non split: nessun dettaglio per-serie
  return next
}