import { useState, useEffect } from 'react'
import { IoBarbell } from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { useWorkoutSession } from '../context/WorkoutSessionContext'
import { restState, ringColor, currentStepInfo } from '../data/workoutPlayer'

const mmss = totalSec => {
  const s = Math.max(0, Math.floor(totalSec))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// Pill del Workout Player in background: compare quando c'è una sessione ma il player NON
// è a schermo intero. Mostra, durante il recupero, il tempo che scorre (stesso colore del
// player, rosso negli ultimi 5s) e sempre "ES: n · RIP: n" — numero dell'ESERCIZIO
// corrente (non della serie) e ripetizioni della serie in corso. Toccandola si riapre il
// player. Vive in Layout, come la TimerPill.
function WorkoutPill() {
  const { t } = useLang()
  const { theme } = useTheme()
  const { session, foreground, openForeground } = useWorkoutSession()

  // Aggiorna una volta al secondo: sulla pill non serve la fluidità dell'anello grande.
  const [, setTick] = useState(0)
  const inRest = session?.phase === 'rest'
  useEffect(() => {
    if (!inRest) return undefined
    const id = setInterval(() => setTick(n => n + 1), 1000)
    return () => clearInterval(id)
  }, [inRest])

  // Visibile solo in background e non a fine allenamento (lì il riepilogo resta a schermo).
  if (!session || foreground || session.phase === 'done') return null

  const info = currentStepInfo(session)
  if (!info) return null

  let time = null
  let color = 'var(--text)'
  if (inRest) {
    const { overtime, secondsLeft, overSec } = restState(session.restStartedAt, session.restTotal)
    time = overtime ? `+${mmss(overSec)}` : mmss(secondsLeft)
    color = ringColor(theme.accent, { overtime, secondsLeft })
  }

  return (
    <button
      onClick={openForeground}
      aria-label={t('player.reopen')}
      className="fixed left-1/2 -translate-x-1/2 bottom-24 z-30 flex items-center gap-3 rounded-full pl-3 pr-4 py-2 backdrop-blur-md border border-[color:var(--border-1)] shadow-lg"
      style={{ backgroundColor: 'color-mix(in srgb, var(--navbar) 85%, transparent)' }}
    >
      <IoBarbell className="text-lg shrink-0" style={{ color: 'var(--accent)' }} />
      {time && (
        <span className="font-bold tabular-nums text-sm" style={{ color }}>{time}</span>
      )}
      <span className="text-xs tabular-nums text-[color:var(--text-dim)]">
        {t('player.pill', { ex: info.exerciseNumber, reps: info.reps })}
      </span>
    </button>
  )
}

export default WorkoutPill
