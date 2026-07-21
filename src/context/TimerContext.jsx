import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { loadRestLog, saveRestLog, addRest, newRestId } from '../data/restLog'

const TimerContext = createContext(null)

const STORAGE_KEY = 'fitpulse-timer'
const REST_KEY = 'fitpulse-rest-duration'

// Colori semantici dei secondi (fissi, indipendenti dall'accento del tema):
// verde nel countdown, rosso negli ultimi 5s e allo 0:00, giallo nel countup.
const GREEN = '#22c55e'
const RED = '#ef4444'
const YELLOW = '#eab308'
// Tempo di recupero di partenza di default (secondi). L'utente lo cambia dal
// wheel picker in Palestra; il valore scelto è la sorgente unica per Recupero.
const DEFAULT_DURATION = 30

// Stato persistito: { status, duration, startedAt, accumulatedMs }
// - status: 'idle' | 'running' | 'paused'
// - startedAt: epoch ms di quando è iniziato il segmento in corso (null se non running)
// - accumulatedMs: ms già trascorsi prima del segmento in corso (per la pausa)
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (saved && saved.status) return saved
  } catch {
    // stato corrotto → riparto pulito
  }
  return { status: 'idle', duration: DEFAULT_DURATION, startedAt: null, accumulatedMs: 0 }
}

// Tempo di recupero scelto (secondi). Distinguo "assente" da "0" salvato.
function loadRestDuration() {
  const raw = localStorage.getItem(REST_KEY)
  const n = raw == null ? DEFAULT_DURATION : Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_DURATION
}

// Millisecondi realmente trascorsi: base accumulata + segmento in corso.
// È qui che l'opzione "timestamp" regge la chiusura/riapertura dell'app.
function elapsedMs(s) {
  let ms = s.accumulatedMs
  if (s.status === 'running' && s.startedAt != null) ms += Date.now() - s.startedAt
  return ms
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// --- Audio (Web Audio, niente file esterni) ---------------------------------
// Un solo AudioContext riusato; va "sbloccato" con un gesto utente (Avvia) per iOS.
let audioCtx = null
function getCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) audioCtx = new AC()
  }
  return audioCtx
}
function unlockAudio() {
  const ctx = getCtx()
  if (ctx && ctx.state === 'suspended') ctx.resume()
}
function beep(ctx, at, freq) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(0.4, at + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18)
  osc.start(at)
  osc.stop(at + 0.2)
}
// Suono + vibrazione allo scadere. Vibrazione: Android sì, iOS Safari NON supporta.
function fireZeroAlert() {
  const ctx = getCtx()
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume()
    const t0 = ctx.currentTime
    beep(ctx, t0, 880)
    beep(ctx, t0 + 0.25, 880)
    beep(ctx, t0 + 0.5, 1046)
  }
  if (navigator.vibrate) navigator.vibrate([200, 100, 200])
}
// ---------------------------------------------------------------------------

export function TimerProvider({ children }) {
  const [state, setState] = useState(loadState)
  const [restDuration, setRestDuration] = useState(loadRestDuration)
  const [, setTick] = useState(0) // forza il re-render mentre il timer scorre

  // Se all'avvio siamo già oltre lo zero (app riaperta dopo lo scadere), non
  // ri-suoniamo: quel beep è nel passato. Init pigra del ref, una sola volta.
  const zeroFiredRef = useRef(null)
  if (zeroFiredRef.current === null) {
    zeroFiredRef.current = elapsedMs(state) >= state.duration * 1000
  }

  // Persistenza a ogni transizione di stato
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  // Persistenza del tempo di recupero scelto in Palestra
  useEffect(() => {
    localStorage.setItem(REST_KEY, String(restDuration))
  }, [restDuration])

  // Tick mentre è in esecuzione: aggiorna il display e controlla lo scadere
  useEffect(() => {
    if (state.status !== 'running') return
    const id = setInterval(() => {
      if (!zeroFiredRef.current && elapsedMs(state) >= state.duration * 1000) {
        zeroFiredRef.current = true
        fireZeroAlert()
        // Il recupero e' arrivato davvero a zero: lo si registra. E' l'unico punto in
        // cui si sa che e' stato COMPLETATO e non interrotto a meta'.
        saveRestLog(addRest(loadRestLog(), {
          id: newRestId(), seconds: state.duration, at: Date.now(),
        }))
      }
      setTick(t => t + 1)
    }, 250)
    return () => clearInterval(id)
  }, [state])

  function start() {
    zeroFiredRef.current = false
    unlockAudio()
    // Cattura il tempo di recupero scelto: il valore vale per QUESTA sessione,
    // cambiare il wheel dopo non altera il conteggio in corso.
    setState({ status: 'running', duration: restDuration, startedAt: Date.now(), accumulatedMs: 0 })
  }
  function pause() {
    setState(s => {
      if (s.status !== 'running') return s
      return { ...s, status: 'paused', startedAt: null, accumulatedMs: s.accumulatedMs + (Date.now() - s.startedAt) }
    })
  }
  function resume() {
    unlockAudio()
    setState(s => (s.status === 'paused' ? { ...s, status: 'running', startedAt: Date.now() } : s))
  }
  function reset() {
    zeroFiredRef.current = false
    setState({ status: 'idle', duration: DEFAULT_DURATION, startedAt: null, accumulatedMs: 0 })
  }

  // Da fermo mostro il tempo di recupero scelto; in corso quello catturato allo start.
  const activeDuration = state.status === 'idle' ? restDuration : state.duration
  const elapsedSec = elapsedMs(state) / 1000
  const isOvertime = elapsedSec >= activeDuration
  const displaySeconds = isOvertime
    ? Math.floor(elapsedSec - activeDuration) // countup: 0, 1, 2...
    : Math.ceil(activeDuration - elapsedSec)  // countdown: es. 30 → 0

  // Colore: verde finché mancano >5s, rosso negli ultimi 5s e allo 0:00, giallo nel countup
  let color
  if (!isOvertime) color = displaySeconds <= 5 ? RED : GREEN
  else color = displaySeconds === 0 ? RED : YELLOW

  // Frazione di tempo ancora da scorrere: serve all'anello di progresso, che si svuota.
  const progress = activeDuration > 0
    ? Math.max(0, Math.min(1, (activeDuration - elapsedSec) / activeDuration))
    : 0

  const value = {
    status: state.status,
    progress,
    duration: activeDuration,
    isOvertime,
    color,
    formatted: formatTime(displaySeconds),
    durationLabel: formatTime(activeDuration),
    restDuration,
    setRestDuration,
    start,
    pause,
    resume,
    reset,
  }

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTimer() {
  return useContext(TimerContext)
}
