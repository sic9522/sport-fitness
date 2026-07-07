import { useState, useRef, useEffect } from 'react'
import { IoStopwatchOutline } from 'react-icons/io5'
import TimerWheel from './TimerWheel'
import { useTimer } from '../context/TimerContext'

function mmss(total) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Selettore compatto del tempo di recupero: mostra solo il valore scelto;
// al tap apre il wheel picker in un popover, che si chiude cliccando fuori.
function RestPicker() {
  const { restDuration, setRestDuration } = useTimer()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-full bg-[var(--surface)] border border-[color:var(--border-2)] pl-2.5 pr-3 py-1.5 hover:bg-[var(--surface-3)] transition-colors"
      >
        <IoStopwatchOutline className="text-base" style={{ color: 'var(--accent)' }} />
        <span className="font-semibold text-sm tabular-nums">{mmss(restDuration)}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-30 rounded-xl p-2 bg-[var(--surface)] border border-[color:var(--border-2)] shadow-xl">
          <TimerWheel value={restDuration} onChange={setRestDuration} max={180} step={5} />
        </div>
      )}
    </div>
  )
}

export default RestPicker
