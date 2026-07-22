import { useState, useEffect } from 'react'
import { IoClose, IoChevronDown, IoCheckmark, IoBarbellOutline, IoCheckmarkCircle } from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { useWorkoutSession } from '../context/WorkoutSessionContext'
import useScrollLock from '../hooks/useScrollLock'
import {
  exerciseCount, stepLabel, elapsedMinutes, formatElapsed, restState, ringColor,
} from '../data/workoutPlayer'
import { formatKg } from '../data/exerciseSets'

// Anima nowMs a ~60fps con requestAnimationFrame: l'anello del recupero scorre fluido,
// senza gli scatti di un tick al secondo.
function useAnimatedNow(active) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return undefined
    let raf
    const loop = () => {
      setNow(Date.now())
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [active])
  return now
}

const mmss = totalSec => {
  const s = Math.max(0, Math.floor(totalSec))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// Barra a segmenti: uno per serie. Comunica a colpo d'occhio quanto manca.
function ProgressSegments({ total, done }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="h-1 flex-1 rounded-full transition-colors duration-300"
          style={{ backgroundColor: i < done ? 'var(--accent)' : 'var(--fill-2)' }}
        />
      ))}
    </div>
  )
}

// Immagine dell'esercizio: foto dell'utente o del catalogo se c'è, altrimenti un
// segnaposto neutro (anche se l'URL non carica). Il 65% vuoto sembrerebbe un errore.
function ExerciseImage({ src, alt }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[var(--surface-3)]">
        <IoBarbellOutline className="text-6xl text-[color:var(--text-faint)]" />
      </div>
    )
  }
  return <img src={src} alt={alt} onError={() => setBroken(true)} className="h-full w-full object-cover" />
}

const RING = 260
const STROKE = 8
const R = (RING - STROKE) / 2
const CIRC = 2 * Math.PI * R

// Fase di recupero. Il tempo si deriva dall'ISTANTE DI INIZIO nel contesto, così player
// e pill di background restano allineati. Allo zero non avanza da solo: diventa un
// cronometro (+mm:ss). Colori: accento, rosso negli ultimi 5s, giallo in cronometro
// (con lo slittamento se l'accento è rosso).
function RestPhase({ restStartedAt, restTotal, step, accent, onProceed }) {
  const { t } = useLang()
  const now = useAnimatedNow(true)
  const { overtime, secondsLeft, overSec, fraction } = restState(restStartedAt, restTotal, now)
  const color = ringColor(accent, { overtime, secondsLeft })
  const display = overtime ? `+${mmss(overSec)}` : mmss(secondsLeft)

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 nut-fade">
      <div className="relative" style={{ width: RING, height: RING }}>
        <svg viewBox={`0 0 ${RING} ${RING}`} className="w-full h-full -rotate-90">
          <circle cx={RING / 2} cy={RING / 2} r={R} fill="none" stroke="var(--ring-track)" strokeWidth={STROKE} />
          <circle
            cx={RING / 2} cy={RING / 2} r={R} fill="none"
            stroke={color} strokeWidth={STROKE} strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - fraction)}
            style={{ transition: 'stroke 400ms ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-dim)]">
            {overtime ? t('player.overtime') : t('player.rest')}
          </span>
          <span className="text-6xl font-extrabold tabular-nums mt-1" style={{ color: overtime ? color : undefined }}>
            {display}
          </span>
        </div>
      </div>

      <p className="mt-10 text-xl font-bold text-center">{step?.nome}</p>
      <p className="mt-1 text-sm text-[color:var(--text-dim)]">{stepLabel(step, t)}</p>

      <button
        onClick={onProceed}
        className="mt-auto mb-8 w-full max-w-sm rounded-full py-4 font-bold transition-colors"
        style={overtime
          ? { backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }
          : { border: '1px solid var(--border-2)' }}
      >
        {overtime ? t('player.next') : t('player.skip')}
      </button>
    </div>
  )
}

// Riepilogo finale.
function DonePhase({ scheda, steps, startedAt, onExit }) {
  const { t } = useLang()
  const stats = [
    { value: `${elapsedMinutes(startedAt)}′`, labelKey: 'player.duration' },
    { value: exerciseCount(steps), labelKey: 'player.exercises' },
    { value: steps.length, labelKey: 'player.sets' },
  ]
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 nut-fade">
      <div className="h-20 w-20 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--fill-1)' }}>
        <IoCheckmarkCircle className="text-5xl" style={{ color: 'var(--accent)' }} />
      </div>
      <h1 className="mt-6 text-3xl font-extrabold text-center leading-tight">{t('player.completed')}</h1>
      <p className="mt-1 text-[color:var(--text-dim)]">{scheda?.nome}</p>
      <div className="mt-8 grid grid-cols-3 gap-3 w-full max-w-sm">
        {stats.map(s => (
          <div key={s.labelKey} className="rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-4 text-center">
            <p className="text-2xl font-extrabold tabular-nums">{s.value}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-dim)]">{t(s.labelKey)}</p>
          </div>
        ))}
      </div>
      <button
        onClick={onExit}
        className="mt-auto mb-8 w-full max-w-sm rounded-full py-4 font-bold"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
      >
        {t('player.backToCard')}
      </button>
    </div>
  )
}

// Modalità di esecuzione a tutto schermo, guidata dal contesto: si mostra solo quando
// c'è una sessione ED è in primo piano. Il tasto "riduci" la manda in background (pill
// in Layout) senza interromperla; la X la abbandona.
function WorkoutPlayer() {
  const { t } = useLang()
  const { theme } = useTheme()
  const { session, foreground, completeSet, proceed, exitSession, sendToBackground } = useWorkoutSession()
  const visible = Boolean(session) && foreground
  useScrollLock(visible)
  const nowClock = useAnimatedNow(visible)

  if (!visible) return null

  const { scheda, steps, index, phase, startedAt, restStartedAt, restTotal } = session
  const step = steps[index]

  if (!steps.length) {
    return (
      <div className="fixed inset-0 z-[70] bg-[var(--body-bg)] flex flex-col items-center justify-center px-8 text-center">
        <p className="text-sm text-[color:var(--text-muted)]">{t('player.empty')}</p>
        <button
          onClick={exitSession}
          className="mt-6 rounded-full px-6 py-3 font-bold"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          {t('player.backToCard')}
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[70] bg-[var(--body-bg)] text-[color:var(--text)] flex flex-col max-w-[430px] mx-auto">
      <div className="px-5 pt-4 shrink-0">
        <ProgressSegments total={steps.length} done={phase === 'done' ? steps.length : index} />
        <div className="flex items-center justify-between mt-3">
          {/* Riduci: manda in background senza interrompere. */}
          <button
            onClick={sendToBackground}
            aria-label={t('player.background')}
            className="text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors"
          >
            <IoChevronDown className="text-2xl" />
          </button>
          <span className="text-xs tabular-nums text-[color:var(--text-dim)]">{formatElapsed(startedAt, nowClock)}</span>
          <div className="flex items-center gap-4">
            <span className="text-xs tabular-nums text-[color:var(--text-dim)]">
              {Math.min(index + 1, steps.length)}/{steps.length}
            </span>
            {/* Abbandona la sessione. */}
            <button onClick={exitSession} aria-label={t('player.exit')} className="text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors">
              <IoClose className="text-2xl" />
            </button>
          </div>
        </div>
      </div>

      {phase === 'rest' && (
        <RestPhase
          key={index}
          restStartedAt={restStartedAt}
          restTotal={restTotal}
          step={step}
          accent={theme.accent}
          onProceed={proceed}
        />
      )}
      {phase === 'done' && <DonePhase scheda={scheda} steps={steps} startedAt={startedAt} onExit={exitSession} />}

      {phase === 'exercise' && (
        <div className="flex-1 flex flex-col nut-fade min-h-0">
          <div className="relative overflow-hidden rounded-b-3xl" style={{ flex: '0 0 65%' }}>
            <ExerciseImage src={step.foto} alt={step.nome} />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
              style={{ background: 'linear-gradient(to top, var(--body-bg), transparent)' }}
            />
          </div>

          <div className="flex-1 px-6 pt-5 pb-8 flex flex-col min-h-0">
            <h1 className="text-3xl font-extrabold leading-tight">{step.nome}</h1>
            <p className="mt-2 text-sm uppercase tracking-[0.08em] text-[color:var(--text-dim)]">{stepLabel(step, t)}</p>

            {(step.kg || step.reps) && (
              <div className="mt-4 flex items-center gap-2">
                {step.kg !== '' && (
                  <span className="rounded-full border border-[color:var(--border-2)] px-3 py-1.5 text-xs font-bold tabular-nums">
                    {formatKg(step.kg)} kg
                  </span>
                )}
                {step.reps !== '' && (
                  <span className="rounded-full border border-[color:var(--border-2)] px-3 py-1.5 text-xs font-bold tabular-nums">
                    {step.reps} {t('player.reps')}
                  </span>
                )}
              </div>
            )}

            <div className="mt-auto flex items-end justify-end">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-dim)]">{t('player.next')}</span>
                <button
                  onClick={completeSet}
                  aria-label={t('player.next')}
                  className="h-20 w-20 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
                >
                  <IoCheckmark className="text-4xl" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkoutPlayer
