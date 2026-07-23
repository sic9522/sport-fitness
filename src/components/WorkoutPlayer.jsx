import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  IoClose, IoCheckmark, IoChevronDown, IoChevronForward, IoBarbellOutline,
  IoTrophy, IoPlayForward, IoStatsChart, IoPlaySkipForward,
} from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { useWorkoutSession } from '../context/WorkoutSessionContext'
import useScrollLock from '../hooks/useScrollLock'
import {
  exerciseCount, stepLabel, elapsedMinutes, formatElapsed, restState, ringColor,
  nextStep, completedExerciseCount,
} from '../data/workoutPlayer'
import { formatKg } from '../data/exerciseSets'
import { PLAYER_ANIM_MS, ACTION_COLORS } from '../data/playerAnimation'
import { useEdgeGlow } from '../hooks/useEdgeGlow'
import EdgeGlow from './EdgeGlow'
import PlayerActionButton from './PlayerActionButton'

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

// Etichetta tecnica in maiuscolo: il tratto distintivo del design Stitch. Ricorre in
// tutte e tre le schermate, quindi vive qui una volta sola.
function Eyebrow({ children, className = '', style }) {
  return (
    <p
      className={`text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-dim)] ${className}`}
      style={style}
    >
      {children}
    </p>
  )
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
// segnaposto neutro (anche se l'URL non carica). Il riquadro vuoto sembrerebbe un errore.
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

// Intestazione comune alle tre schermate: chiudi, titolo in accento, riduci a icona.
function PlayerHeader({ onExit, onBackground, t }) {
  return (
    <div className="flex items-center justify-between px-5 pt-4">
      <button
        onClick={onExit}
        aria-label={t('player.exit')}
        className="text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors"
      >
        <IoClose className="text-2xl" />
      </button>
      <h2 className="text-lg font-extrabold tracking-tight" style={{ color: 'var(--accent)' }}>
        {t('player.inProgress')}
      </h2>
      <button
        onClick={onBackground}
        aria-label={t('player.background')}
        className="text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors"
      >
        <IoChevronDown className="text-2xl" />
      </button>
    </div>
  )
}

// Riquadro metrica del riepilogo.
function StatCard({ label, value, unit, className = '' }) {
  return (
    <div className={`rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-4 ${className}`}>
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-1.5 text-2xl font-extrabold tabular-nums leading-none">
        {value}
        {unit && <span className="ml-1 text-[11px] font-bold text-[color:var(--text-dim)]">{unit}</span>}
      </p>
    </div>
  )
}

const RING = 250
const STROKE = 10
const R = (RING - STROKE) / 2
const CIRC = 2 * Math.PI * R

// Fase di recupero. Il tempo si deriva dall'ISTANTE DI INIZIO nel contesto, così player
// e pill di background restano allineati. Allo zero non avanza da solo: diventa un
// cronometro (+mm:ss). Colori: accento, rosso negli ultimi 5s, giallo in cronometro
// (con lo slittamento se l'accento è rosso).
function RestPhase({ restStartedAt, restTotal, upcoming, accent, onProceed, t }) {
  const now = useAnimatedNow(true)
  const { overtime, secondsLeft, overSec, fraction } = restState(restStartedAt, restTotal, now)
  const color = ringColor(accent, { overtime, secondsLeft })

  return (
    <div className="flex-1 flex flex-col items-center px-6 pb-8 player-fade-in min-h-0">
      <Eyebrow className="mt-8">{overtime ? t('player.overtime') : t('player.restInProgress')}</Eyebrow>

      <div className="relative mt-6" style={{ width: RING, height: RING }}>
        <svg viewBox={`0 0 ${RING} ${RING}`} className="w-full h-full -rotate-90">
          <circle cx={RING / 2} cy={RING / 2} r={R} fill="none" stroke="var(--ring-track)" strokeWidth={STROKE} />
          <circle
            cx={RING / 2} cy={RING / 2} r={R} fill="none"
            stroke={color} strokeWidth={STROKE} strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - fraction)}
            style={{ transition: 'stroke 400ms ease', filter: `drop-shadow(0 0 12px ${color}66)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-6xl font-extrabold tabular-nums leading-none" style={{ color }}>
            {overtime ? `+${mmss(overSec)}` : secondsLeft}
          </span>
          <Eyebrow className="mt-2">{overtime ? t('player.overtime') : t('player.seconds')}</Eyebrow>
        </div>
      </div>

      {/* Cosa arriva dopo: durante la pausa serve sapere il prossimo, non l'appena finito. */}
      {upcoming && (
        <div className="mt-8 w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-3 flex items-center gap-3">
          <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0">
            <ExerciseImage src={upcoming.foto} alt={upcoming.nome} />
          </div>
          <div className="min-w-0 flex-1">
            <Eyebrow>{t('player.upcoming')}</Eyebrow>
            <p className="mt-0.5 text-lg font-extrabold leading-tight truncate">{upcoming.nome}</p>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <span
                className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                style={{ backgroundColor: 'var(--fill-1)' }}
              >
                {stepLabel(upcoming, t)}
              </span>
              {upcoming.kg !== '' && (
                <span className="text-xs font-bold tabular-nums text-[color:var(--text-dim)]">
                  · {formatKg(upcoming.kg)} kg
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onProceed}
        className="mt-auto w-full max-w-sm rounded-full py-4 font-extrabold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
      >
        {overtime ? t('player.next') : t('player.skipTimer')}
        <IoPlayForward className="text-lg" />
      </button>
    </div>
  )
}

// Riepilogo finale. Mostra solo numeri VERI: durata cronometrata, esercizi e serie
// portati a termine sul totale previsto. Niente calorie: senza peso corporeo né
// frequenza cardiaca sarebbero un numero inventato.
function DonePhase({ scheda, steps, completed, startedAt, onExit, t }) {
  // "svolti su totale": un esercizio è un ESERCIZIO, non una ripetizione. Le serie
  // saltate non fanno numero, quindi i due valori possono non coincidere.
  const doneExercises = completedExerciseCount(steps, completed)
  const totalExercises = exerciseCount(steps)
  const doneSets = completed?.length || 0
  const minutes = elapsedMinutes(startedAt)
  const hhmm = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

  return (
    <div className="flex-1 flex flex-col items-center px-6 pb-8 player-fade-in min-h-0 overflow-y-auto">
      <div
        className="mt-6 h-24 w-24 rounded-3xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
      >
        <IoTrophy className="text-5xl" />
      </div>

      <h1 className="mt-6 text-4xl font-extrabold text-center leading-[1.05] tracking-tight">
        {t('player.completed')}
      </h1>
      <p className="mt-3 text-sm text-center text-[color:var(--text-dim)] max-w-xs">
        {t('player.completedSub', { nome: scheda?.nome || '' })}
      </p>

      <div className="mt-7 w-full max-w-sm space-y-3">
        <StatCard label={t('player.totalDuration')} value={hhmm} unit={t('player.hours')} />
        <div className="grid grid-cols-2 gap-3">
          <StatCard label={t('player.exercises')} value={`${doneExercises}/${totalExercises}`} />
          <StatCard label={t('player.sets')} value={`${doneSets}/${steps.length}`} />
        </div>

        {/* Porta dove i progressi esistono davvero: la pagina Statistiche. */}
        <Link
          to="/insights"
          onClick={onExit}
          className="flex items-center gap-3 rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-4 hover:bg-[var(--surface-2)] transition-colors"
        >
          <span
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--fill-1)', color: 'var(--accent)' }}
          >
            <IoStatsChart className="text-lg" />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-sm font-bold">{t('player.seeProgress')}</span>
            <span className="block text-xs text-[color:var(--text-dim)]">{t('player.seeProgressSub')}</span>
          </span>
          <IoChevronForward className="text-[color:var(--text-muted)] shrink-0" />
        </Link>
      </div>

      <button
        onClick={onExit}
        className="mt-auto pt-6 w-full max-w-sm shrink-0"
      >
        <span
          className="block w-full rounded-full py-4 font-extrabold hover:opacity-90 transition-opacity"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          {t('player.finish')}
        </span>
      </button>
    </div>
  )
}

// Fase di esecuzione: immagine grande, nome, serie, e i due comandi (salta / conferma).
function ExercisePhase({ step, index, steps, elapsed, onSkip, onComplete, t }) {
  return (
    <div key={index} className="flex-1 flex flex-col player-step-in min-h-0">
      <div className="px-5 pt-3 shrink-0">
        <div className="flex items-center justify-between">
          <Eyebrow>{t('player.executing')}</Eyebrow>
          <div className="flex items-center gap-2">
            {/* LIVE: la sessione è in corso adesso, con il cronometro che scorre. */}
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em]"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              {t('player.live')}
            </span>
            <span className="text-xs font-bold tabular-nums text-[color:var(--text-dim)]">{elapsed}</span>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden mt-3" style={{ flex: '1 1 0%', minHeight: 0 }}>
        <ExerciseImage src={step.foto} alt={step.nome} />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
          style={{ background: 'linear-gradient(to top, var(--body-bg), transparent)' }}
        />
      </div>

      <div className="px-6 pb-6 shrink-0 -mt-6 relative">
        <h1 className="text-4xl font-extrabold leading-none tracking-tight">{step.nome}</h1>

        <div className="mt-3 flex items-center gap-3 flex-wrap text-xs text-[color:var(--text-dim)]">
          <span className="font-bold">{stepLabel(step, t)}</span>
          {step.reps !== '' && (
            <span className="font-bold">
              · {t('player.target')}: {step.reps} {t('player.reps')}
            </span>
          )}
        </div>

        <div className="mt-3">
          <ProgressSegments total={steps.length} done={index} />
        </div>

        <div className="mt-5 flex items-end gap-6">
          {step.kg !== '' && (
            <div>
              <Eyebrow>{t('player.weight')}</Eyebrow>
              <p className="mt-0.5 text-2xl font-extrabold tabular-nums leading-none">
                {formatKg(step.kg)}
                <span className="ml-1 text-[11px] font-bold text-[color:var(--text-dim)]">kg</span>
              </p>
            </div>
          )}
          <div>
            <Eyebrow>{t('player.set')}</Eyebrow>
            <p className="mt-0.5 text-2xl font-extrabold tabular-nums leading-none">
              {index + 1}
              <span className="text-[11px] font-bold text-[color:var(--text-dim)]">/{steps.length}</span>
            </p>
          </div>
        </div>

        {/* Azioni: sola icona, senza fondo pieno. Il colore vive nell'icona e ricompare
            sul bordo della pagina al tocco. Entrambe raggruppate a destra, con la
            conferma all'estremita': resta il bersaglio piu' comodo per il pollice, e
            "salta" le sta accanto senza poter essere premuto per sbaglio al suo posto. */}
        <div className="mt-6 flex items-center justify-end gap-4">
          <PlayerActionButton
            icon={IoPlaySkipForward}
            color={ACTION_COLORS.skip}
            label={t('player.skipSet')}
            onClick={onSkip}
          />
          <PlayerActionButton
            icon={IoCheckmark}
            color={ACTION_COLORS.confirm}
            label={t('player.next')}
            onClick={onComplete}
            primary
          />
        </div>
      </div>
    </div>
  )
}

// Modalità di esecuzione a tutto schermo, guidata dal contesto: si mostra solo quando
// c'è una sessione ED è in primo piano. Il tasto "riduci" la manda in background (pill
// in Layout) senza interromperla; la X la abbandona.
function WorkoutPlayer() {
  const { t } = useLang()
  const { theme } = useTheme()
  const {
    session, foreground, completeSet, proceed, skipSet, exitSession, sendToBackground,
  } = useWorkoutSession()
  const visible = Boolean(session) && foreground
  useScrollLock(visible)
  const nowClock = useAnimatedNow(visible)
  const { glow, trigger } = useEdgeGlow()

  // Il bordo parte NELLO STESSO tick dell'azione: cosi' la sua animazione e la slide
  // dell'esercizio iniziano e finiscono insieme (stessa durata, PLAYER_ANIM_MS) e
  // l'utente le percepisce come un unico gesto. La logica di navigazione resta invariata.
  const handleSkip = () => {
    trigger(ACTION_COLORS.skip)
    skipSet()
  }
  const handleComplete = () => {
    trigger(ACTION_COLORS.confirm)
    completeSet()
  }

  if (!visible) return null

  const { scheda, steps, index, phase, startedAt, restStartedAt, restTotal, completed } = session
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
    <div
      className="fixed inset-0 z-[70] bg-[var(--body-bg)] text-[color:var(--text)] flex flex-col max-w-[430px] mx-auto"
      // Sorgente unica della durata: da qui CSS e JS leggono lo stesso valore.
      style={{ '--player-anim': `${PLAYER_ANIM_MS}ms` }}
    >
      <PlayerHeader onExit={exitSession} onBackground={sendToBackground} t={t} />

      {/* Area contenuto: il bordo luminoso vive QUI dentro, quindi avvolge solo la
          pagina e lascia fuori l'intestazione, come da specifica. */}
      <div className="relative flex-1 flex flex-col min-h-0">
        <EdgeGlow glow={glow} />

        {phase === 'exercise' && (
          <ExercisePhase
            step={step}
            index={index}
            steps={steps}
            elapsed={formatElapsed(startedAt, nowClock)}
            onSkip={handleSkip}
            onComplete={handleComplete}
            t={t}
          />
        )}

        {phase === 'rest' && (
          <RestPhase
            key={index}
            restStartedAt={restStartedAt}
            restTotal={restTotal}
            upcoming={nextStep(session)}
            accent={theme.accent}
            onProceed={proceed}
            t={t}
          />
        )}

        {phase === 'done' && (
          <DonePhase
            scheda={scheda}
            steps={steps}
            completed={completed}
            startedAt={startedAt}
            onExit={exitSession}
            t={t}
          />
        )}
      </div>
    </div>
  )
}

export default WorkoutPlayer
