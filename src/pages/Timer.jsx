import { IoStopwatch, IoPlay, IoPause, IoRefresh } from 'react-icons/io5'
import TopBar from '../components/TopBar'
import { useLang } from '../context/LanguageContext'
import { useTimer } from '../context/TimerContext'

function Timer() {
  const { t } = useLang()
  const { status, color, formatted, durationLabel, start, pause, resume, reset } = useTimer()

  const isRunning = status === 'running'
  const isPaused = status === 'paused'

  const primary = isRunning ? pause : isPaused ? resume : start
  const primaryLabel = isRunning ? t('timer.pause') : isPaused ? t('timer.resume') : t('timer.start')
  const PrimaryIcon = isRunning ? IoPause : IoPlay

  return (
    <div className="flex flex-col min-h-screen pb-28">
      <TopBar icon={IoStopwatch} title={t('title.timer')} />

      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-6">
        <p className="text-[color:var(--text-muted)] text-xs uppercase tracking-widest">
          {t('timer.rest')}
        </p>

        <div className="text-7xl font-extrabold tabular-nums transition-colors" style={{ color }}>
          {formatted}
        </div>

        <p className="text-[color:var(--text-dim)] text-xs">
          {t('timer.from', { time: durationLabel })}
        </p>

        <div className="flex items-center gap-3 w-full max-w-xs mt-4">
          <button
            onClick={primary}
            className="flex-1 rounded-xl py-4 flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-sm"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            <PrimaryIcon className="text-xl" />
            {primaryLabel}
          </button>
          <button
            onClick={reset}
            disabled={status === 'idle'}
            className="rounded-xl py-4 px-5 flex items-center justify-center bg-[var(--surface)] text-[color:var(--text)] hover:bg-[var(--surface-3)] transition-colors disabled:opacity-40"
          >
            <IoRefresh className="text-xl" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Timer
