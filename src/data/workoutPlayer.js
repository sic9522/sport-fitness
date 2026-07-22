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

// --- Colori del timer di recupero ---
// La base e' l'accento scelto dall'utente. Negli ultimi 5 secondi diventa rosso per
// avvisare che il recupero sta per finire; a zero passa a cronometro e diventa giallo.
// MA se l'accento e' gia' rosso quei due colori si confonderebbero con la base, quindi
// slittano: pericolo -> giallo, cronometro -> verde.
const RED = '#ef4444'
const YELLOW = '#f59e0b'
const GREEN = '#22c55e'
const LAST_SECONDS = 5

// Tinta (0-359) di un colore #rrggbb, oppure null se non interpretabile.
export function hexHue(hex) {
  const h = String(hex || '').replace('#', '')
  if (h.length < 6) return null
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  if (d === 0) return 0 // grigio: tinta convenzionale 0
  let hue
  if (max === r) hue = ((g - b) / d) % 6
  else if (max === g) hue = (b - r) / d + 2
  else hue = (r - g) / d + 4
  return (Math.round(hue * 60) + 360) % 360
}

// L'accento e' "rosso" se la sua tinta cade entro ~20 gradi dal rosso puro.
export function isReddish(hex) {
  const h = hexHue(hex)
  return h != null && (h <= 20 || h >= 340)
}

// I tre colori della fase di recupero, dato l'accento.
export function timerColors(accent) {
  const reddish = isReddish(accent)
  return {
    base: accent,
    danger: reddish ? YELLOW : RED,
    overtime: reddish ? GREEN : YELLOW,
  }
}

// Colore corrente dell'anello: cronometro -> overtime; ultimi 5s del countdown ->
// danger; altrimenti base.
export function ringColor(accent, { overtime, secondsLeft }) {
  const c = timerColors(accent)
  if (overtime) return c.overtime
  if (secondsLeft <= LAST_SECONDS) return c.danger
  return c.base
}
