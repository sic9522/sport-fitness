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

// Stato del recupero calcolato dall'ISTANTE DI INIZIO: player e pill lo derivano dalla
// stessa sorgente, quindi restano allineati anche se uno dei due non è a schermo.
export function restState(restStartedAt, restTotal, now = Date.now()) {
  const elapsed = Math.max(0, (now - Number(restStartedAt || 0)) / 1000)
  const overtime = elapsed >= restTotal
  return {
    overtime,
    secondsLeft: overtime ? 0 : Math.ceil(restTotal - elapsed),
    overSec: overtime ? Math.floor(elapsed - restTotal) : 0,
    fraction: overtime || restTotal <= 0 ? 1 : Math.max(0, (restTotal - elapsed) / restTotal),
  }
}

// --- Metriche reali del riepilogo ---
// Un esercizio conta come SVOLTO solo se se ne completano TUTTE le serie.
//
// La soglia era al 50%, ma contava come fatto un esercizio lasciato a meta': il conteggio
// finiva per premiare anche cio' che era stato in gran parte saltato. Qui interessa
// distinguere l'esercizio davvero eseguito da quello soltanto attraversato, quindi vale
// solo il completamento pieno.
//
// Resta una soglia e non un confronto secco proprio per poterla riabbassare con un numero
// solo, se un giorno servisse tornare a considerare i parziali.
const DONE_RATIO = 1

// Quante serie sono previste e quante svolte, per ogni esercizio distinto.
function perExercise(steps, completed) {
  const done = new Set(Array.isArray(completed) ? completed : [])
  const map = new Map()
  ;(steps || []).forEach((step, i) => {
    if (!step?.exerciseId) return
    const e = map.get(step.exerciseId) || { total: 0, done: 0 }
    e.total += 1
    if (done.has(i)) e.done += 1
    map.set(step.exerciseId, e)
  })
  return map
}

// Gli esercizi che superano la soglia. E' la base sia del conteggio esercizi sia di
// quello delle ripetizioni: tenere una sola definizione di "svolto" evita che le due
// cifre mostrate sulla stessa riga possano contraddirsi.
export function completedExerciseIds(steps, completed) {
  const ids = new Set()
  perExercise(steps, completed).forEach(({ total, done }, id) => {
    if (total > 0 && done / total >= DONE_RATIO) ids.add(id)
  })
  return ids
}

// Quanti esercizi DISTINTI risultano svolti secondo la soglia del 50%. Un esercizio non
// e' una serie: tre serie di panca restano UN esercizio.
export const completedExerciseCount = (steps, completed) =>
  completedExerciseIds(steps, completed).size

// Ripetizioni completate: somma DIRETTA delle serie confermate, una per una.
// Niente soglia qui — quella governa il conteggio degli ESERCIZI, non questo. Fatta 1
// serie su 3 di un esercizio da 8 ripetizioni, il contatore segna 8: sono ripetizioni
// realmente eseguite, e nasconderle finche' non si supera meta' esercizio le farebbe
// sparire pur essendo state fatte.
export function completedReps(steps, completed) {
  const done = Array.isArray(completed) ? completed : []
  return done.reduce((sum, i) => sum + repsOf(steps?.[i]), 0)
}

const repsOf = step => {
  const n = Number(String(step?.reps ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

// Il passo successivo, per la card "PROSSIMO" mostrata durante il recupero: durante la
// pausa serve sapere cosa arriva, non cosa si e' appena finito.
export function nextStep(session) {
  const i = nextIndex(session?.index ?? -1, session?.steps)
  return i == null ? null : session.steps[i]
}

// Info del passo corrente per la pill di background. Il numero dell'esercizio conta gli
// esercizi DISTINTI, non le serie: alla seconda esercizio dopo uno split da 3 serie è
// "2", non "4". Le ripetizioni sono quelle della serie corrente (con lo split cambiano
// da una serie all'altra).
export function currentStepInfo(session) {
  const step = session?.steps?.[session?.index]
  if (!step) return null
  return {
    exerciseNumber: step.exerciseIndex + 1,
    reps: step.reps,
    nome: step.nome,
    phase: session.phase,
  }
}
