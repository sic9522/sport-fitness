import { useState, useEffect, useRef } from 'react'
import { IoClose, IoCheckmark, IoBarbellOutline, IoCheckmarkCircle } from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'
import useScrollLock from '../hooks/useScrollLock'
import {
  buildSteps, exerciseCount, stepLabel, elapsedMinutes, formatElapsed,
} from '../data/workoutPlayer'
import { formatKg } from '../data/exerciseSets'

const DEFAULT_REST = 60 // secondi, se la scheda non ne definisce uno

// Barra a segmenti: uno per serie. Comunica a colpo d'occhio quanto manca, cosa che
// una percentuale non farebbe con la stessa immediatezza.
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
// segnaposto neutro. Non si lascia mai un buco: il 65% dello schermo vuoto sembrerebbe
// un errore di caricamento.
function ExerciseImage({ src, alt }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[var(--surface-3)]">
        <IoBarbellOutline className="text-6xl text-[color:var(--text-faint)]" />
      </div>
    )
  }
  return (
    <img src={src} alt={alt} onError={() => setBroken(true)} className="h-full w-full object-cover" />
  )
}

const ringGeom = size => {
  const stroke = 8
  const r = (size - stroke) / 2
  return { stroke, r, c: size / 2, circumference: 2 * Math.PI * r }
}

// Fase di recupero: schermata dedicata, come da progetto. Al termine torna da sola alla
// serie successiva, così l'utente non deve toccare nulla fra una serie e l'altra.
function RestPhase({ seconds, total, step, onSkip }) {
  const { t } = useLang()
  const size = 260
  const { stroke, r, c, circumference } = ringGeom(size)
  const progress = total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 0

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 nut-fade">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
          <circle cx={c} cy={c} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
          <circle
            cx={c} cy={c} r={r} fill="none"
            stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-dim)]">
            {t('player.rest')}
          </span>
          <span className="text-6xl font-extrabold tabular-nums mt-1">
            {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
          </span>
        </div>
      </div>

      <p className="mt-10 text-xl font-bold text-center">{step?.nome}</p>
      <p className="mt-1 text-sm text-[color:var(--text-dim)]">{stepLabel(step, t)}</p>

      <button
        onClick={onSkip}
        className="mt-auto mb-8 w-full max-w-sm rounded-full py-4 font-bold border border-[color:var(--border-2)] hover:bg-[var(--surface-3)] transition-colors"
      >
        {t('player.skip')}
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
      <div
        className="h-20 w-20 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--fill-1)' }}
      >
        <IoCheckmarkCircle className="text-5xl" style={{ color: 'var(--accent)' }} />
      </div>

      <h1 className="mt-6 text-3xl font-extrabold text-center leading-tight">{t('player.completed')}</h1>
      <p className="mt-1 text-[color:var(--text-dim)]">{scheda?.nome}</p>

      <div className="mt-8 grid grid-cols-3 gap-3 w-full max-w-sm">
        {stats.map(s => (
          <div key={s.labelKey} className="rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-4 text-center">
            <p className="text-2xl font-extrabold tabular-nums">{s.value}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-dim)]">
              {t(s.labelKey)}
            </p>
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

// Modalità di esecuzione a tutto schermo: accompagna dalla prima all'ultima serie
// alternando esercizio e recupero, senza mai far tornare alla scheda.
// `onFinish(riepilogo)` viene chiamata solo se l'allenamento è stato COMPLETATO:
// uscendo a metà non si registra nulla, perché non è un allenamento svolto.
function WorkoutPlayer({ scheda, onExit, onFinish }) {
  const { t } = useLang()
  useScrollLock()

  const [steps] = useState(() => buildSteps(scheda))
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState('exercise') // exercise | rest | done
  const [rest, setRest] = useState(0)
  const [startedAt] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState('00:00')

  const restTotal = Number(scheda?.rest) > 0 ? Number(scheda.rest) : DEFAULT_REST
  const step = steps[index]
  const finishedRef = useRef(false)

  // Cronometro dell'intero allenamento, in alto.
  useEffect(() => {
    const id = setInterval(() => setElapsed(formatElapsed(startedAt)), 1000)
    return () => clearInterval(id)
  }, [startedAt])

  // Countdown del recupero: a zero riparte da solo con la serie successiva.
  useEffect(() => {
    if (phase !== 'rest') return undefined
    const id = setInterval(() => {
      setRest(s => {
        if (s <= 1) {
          clearInterval(id)
          advance()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Segnala il completamento una volta sola, quando si arriva alla fine.
  useEffect(() => {
    if (phase !== 'done' || finishedRef.current) return
    finishedRef.current = true
    onFinish?.({
      durationMin: elapsedMinutes(startedAt),
      exercises: exerciseCount(steps),
      sets: steps.length,
    })
  }, [phase, onFinish, startedAt, steps])

  function advance() {
    setIndex(i => {
      const next = i + 1
      if (next >= steps.length) {
        setPhase('done')
        return i
      }
      setPhase('exercise')
      return next
    })
  }

  // Serie completata: si va SEMPRE al recupero, tranne dopo l'ultima, dove il recupero
  // non avrebbe scopo e si passa direttamente al riepilogo.
  function completeSet() {
    if (index + 1 >= steps.length) {
      setPhase('done')
      return
    }
    setRest(restTotal)
    setPhase('rest')
  }

  // Scheda senza serie: non c'è nulla da eseguire, meglio dirlo che mostrare un player vuoto.
  if (!steps.length) {
    return (
      <div className="fixed inset-0 z-[70] bg-[var(--body-bg)] flex flex-col items-center justify-center px-8 text-center">
        <p className="text-sm text-[color:var(--text-muted)]">{t('player.empty')}</p>
        <button
          onClick={onExit}
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
      {/* Intestazione: avanzamento, uscita e cronometro. Resta identica in tutte le fasi
          così non "salta" passando da esercizio a recupero. */}
      <div className="px-5 pt-4 shrink-0">
        <ProgressSegments total={steps.length} done={phase === 'done' ? steps.length : index} />
        <div className="flex items-center justify-between mt-3">
          <button onClick={onExit} aria-label={t('player.exit')} className="text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors">
            <IoClose className="text-2xl" />
          </button>
          <span className="text-xs tabular-nums text-[color:var(--text-dim)]">{elapsed}</span>
          <span className="text-xs tabular-nums text-[color:var(--text-dim)]">
            {Math.min(index + 1, steps.length)}/{steps.length}
          </span>
        </div>
      </div>

      {phase === 'rest' && <RestPhase seconds={rest} total={restTotal} step={step} onSkip={advance} />}
      {phase === 'done' && <DonePhase scheda={scheda} steps={steps} startedAt={startedAt} onExit={onExit} />}

      {phase === 'exercise' && (
        <div className="flex-1 flex flex-col nut-fade min-h-0">
          {/* 65% dello schermo all'immagine, come da progetto. */}
          <div className="relative overflow-hidden rounded-b-3xl" style={{ flex: '0 0 65%' }}>
            <ExerciseImage src={step.foto} alt={step.nome} />
            {/* Sfumatura verso il fondo: fa respirare il testo sotto senza scurire la foto. */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
              style={{ background: 'linear-gradient(to top, var(--body-bg), transparent)' }}
            />
          </div>

          <div className="flex-1 px-6 pt-5 pb-8 flex flex-col min-h-0">
            <h1 className="text-3xl font-extrabold leading-tight">{step.nome}</h1>
            <p className="mt-2 text-sm uppercase tracking-[0.08em] text-[color:var(--text-dim)]">
              {stepLabel(step, t)}
            </p>

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
                <span className="text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-dim)]">
                  {t('player.next')}
                </span>
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
