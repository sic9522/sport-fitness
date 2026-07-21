import { useState } from 'react'
import { IoStopwatch, IoPlay, IoPause, IoRefresh } from 'react-icons/io5'
import TopBar from '../components/TopBar'
import { useLang } from '../context/LanguageContext'
import { useTimer } from '../context/TimerContext'
import { loadRestLog, formatRest } from '../data/restLog'

// Durate rapide del mockup. In secondi: le etichette si ricavano da formatRest, così
// non possono divergere dal valore reale.
const QUICK = [30, 60, 90, 120, 180]

const RING = { size: 240, stroke: 12 }
const RADIUS = (RING.size - RING.stroke) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// Anello che si svuota mentre il recupero scorre, con il tempo al centro.
// `progress` va da 1 (pieno) a 0 (scaduto).
function TimerRing({ progress, formatted, color, label }) {
  const c = RING.size / 2
  return (
    <div className="relative" style={{ width: RING.size, height: RING.size }}>
      <svg viewBox={`0 0 ${RING.size} ${RING.size}`} className="w-full h-full -rotate-90">
        <circle cx={c} cy={c} r={RADIUS} fill="none" stroke="var(--ring-track)" strokeWidth={RING.stroke} />
        <circle
          cx={c} cy={c} r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={RING.stroke}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          style={{ transition: 'stroke-dashoffset 250ms linear, stroke 300ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-extrabold tabular-nums" style={{ color }}>{formatted}</span>
        <span className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-dim)]">
          {label}
        </span>
      </div>
    </div>
  )
}

function Timer() {
  const { t, lang } = useLang()
  const {
    status, progress, color, formatted, restDuration, setRestDuration,
    start, pause, resume, reset,
  } = useTimer()

  // Lo storico si legge al montaggio e si rilegge quando il timer torna a riposo:
  // è il momento in cui una nuova voce può essere comparsa.
  const [log, setLog] = useState(loadRestLog)
  const [lastStatus, setLastStatus] = useState(status)
  if (status !== lastStatus) {
    setLastStatus(status)
    if (status === 'idle') setLog(loadRestLog())
  }

  const isRunning = status === 'running'
  const isPaused = status === 'paused'
  const primary = isRunning ? pause : isPaused ? resume : start
  const primaryLabel = isRunning ? t('timer.pause') : isPaused ? t('timer.resume') : t('timer.start')
  const PrimaryIcon = isRunning ? IoPause : IoPlay

  return (
    <div className="flex flex-col pb-28">
      <TopBar icon={IoStopwatch} title={t('title.timer')} />

      <div className="px-5 pt-6 flex flex-col items-center">
        <TimerRing progress={progress} formatted={formatted} color={color} label={t('timer.remaining')} />

        {/* Durate rapide: si possono cambiare solo da fermi, altrimenti si altererebbe
            un recupero già in corso. */}
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          {QUICK.map(sec => {
            const active = restDuration === sec
            return (
              <button
                key={sec}
                onClick={() => setRestDuration(sec)}
                disabled={status !== 'idle'}
                className="rounded-full px-4 py-2 text-xs font-bold tabular-nums border transition-colors disabled:opacity-40"
                style={active
                  ? { backgroundColor: 'var(--accent)', color: 'var(--on-accent)', borderColor: 'transparent' }
                  : { borderColor: 'var(--border-2)', color: 'var(--text-dim)' }}
              >
                {formatRest(sec)}
              </button>
            )
          })}
        </div>

        <div className="mt-6 flex items-center gap-3 w-full max-w-sm">
          <button
            onClick={reset}
            disabled={status === 'idle'}
            className="flex-1 rounded-full py-3.5 flex items-center justify-center gap-2 font-semibold border border-[color:var(--border-2)] text-[color:var(--text)] hover:bg-[var(--surface-3)] transition-colors disabled:opacity-40"
          >
            <IoRefresh className="text-lg" />
            {t('timer.reset')}
          </button>
          <button
            onClick={primary}
            className="flex-1 rounded-full py-3.5 flex items-center justify-center gap-2 font-bold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            <PrimaryIcon className="text-lg" />
            {primaryLabel}
          </button>
        </div>
      </div>

      {/* Ultimi recuperi: solo quelli arrivati davvero a zero. Se non ce ne sono ancora,
          la card non compare affatto invece di mostrare righe vuote. */}
      {log.length > 0 && (
        <div className="px-5 mt-8">
          <div className="rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-4">
            <h2 className="font-bold text-sm mb-1">{t('timer.recent')}</h2>
            <div className="divide-y divide-[color:var(--border-1)]">
              {log.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2.5">
                  <span className="font-semibold tabular-nums text-sm">{formatRest(r.seconds)}</span>
                  <span className="text-xs text-[color:var(--text-dim)] tabular-nums">
                    {new Date(r.at).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Timer
