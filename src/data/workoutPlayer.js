// Sequenza di esecuzione di una scheda: la lista PIATTA di tutte le serie da svolgere,
// una dopo l'altra. Il Workout Player scorre questa lista e non deve piu' ragionare su
// esercizi e serie annidati.
//
// Ogni passo porta con se' tutto cio' che serve a schermo, cosi' il componente non deve
// risalire all'esercizio per sapere carico e ripetizioni:
//   { key, exerciseId, exerciseIndex, nome, foto, setIndex, setCount, reps, kg, isSplit }
import { serieCount, editorRows } from './exerciseSets'

// Espande la scheda nella sequenza dei passi. Gli esercizi senza serie valide vengono
// saltati: un esercizio a zero serie non e' un passo, e lasciarlo produrrebbe una
// schermata vuota senza nulla da completare.
export function buildSteps(scheda) {
  const esercizi = Array.isArray(scheda?.esercizi) ? scheda.esercizi : []
  const steps = []

  esercizi.forEach((ex, exerciseIndex) => {
    const count = serieCount(ex)
    if (!count) return
    // Con split ON ogni serie ha la sua riga; senza, la riga unica vale per tutte.
    const rows = editorRows(ex)
    const isSplit = Boolean(ex.split)

    for (let i = 0; i < count; i += 1) {
      const row = isSplit ? (rows[i] || rows[0] || {}) : (rows[0] || {})
      steps.push({
        key: `${ex.id || exerciseIndex}-${i}`,
        exerciseId: ex.id ?? String(exerciseIndex),
        exerciseIndex,
        nome: ex.titolo || ex.nome || '',
        foto: ex.foto || null,
        setIndex: i,          // 0-based
        setCount: count,
        reps: row.reps ?? '',
        kg: row.kg ?? '',
        isSplit,
      })
    }
  })

  return steps
}

// Quanti esercizi distinti compaiono nella sequenza: serve al riepilogo finale.
export function exerciseCount(steps) {
  return new Set((steps || []).map(s => s.exerciseId)).size
}

// Etichetta della serie corrente. Con gli split si indica anche quale split si sta
// eseguendo, perche' carico e ripetizioni cambiano da una serie all'altra e senza
// quel riferimento non si capirebbe a quale riga guardare.
export function stepLabel(step, t) {
  if (!step) return ''
  const serie = t('player.setOf', { n: step.setIndex + 1, total: step.setCount })
  if (!step.isSplit) return serie
  return `${t('player.split', { n: step.setIndex + 1 })} · ${serie}`
}

// Passo successivo, oppure null se l'allenamento e' finito.
export const nextIndex = (index, steps) => (index + 1 < (steps?.length || 0) ? index + 1 : null)

// Percentuale completata, per la barra a segmenti in cima.
export function progressAt(index, steps) {
  const total = steps?.length || 0
  if (!total) return 0
  return Math.min(1, Math.max(0, index / total))
}

// --- Sessione in corso, persistita: sopravvive a refresh e blocco schermo ---
// Senza questo, uscire dall'app a meta' allenamento perderebbe l'avanzamento.
const KEY = 'fitpulse-player-session'

export function loadPlayerSession() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (s && typeof s.index === 'number' && Number(s.startedAt) > 0) return s
  } catch {
    // dato corrotto → nessuna sessione
  }
  return null
}

export function savePlayerSession(session) {
  localStorage.setItem(KEY, JSON.stringify(session))
}

export function clearPlayerSession() {
  localStorage.removeItem(KEY)
}

// Minuti trascorsi, arrotondati: la durata mostrata a fine allenamento.
export function elapsedMinutes(startedAt, now = Date.now()) {
  const ms = now - Number(startedAt || 0)
  return ms > 0 ? Math.round(ms / 60000) : 0
}

// mm:ss dei secondi trascorsi, per il cronometro in alto.
export function formatElapsed(startedAt, now = Date.now()) {
  const sec = Math.max(0, Math.floor((now - Number(startedAt || 0)) / 1000))
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
}
