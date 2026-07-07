import { useLocation, useNavigate } from 'react-router-dom'
import { IoStopwatch } from 'react-icons/io5'
import { useTimer } from '../context/TimerContext'

// Mini-pillola: mostra il timer che scorre quando sei su un'altra pagina.
// Sostituto "web" del notch/notifica nativi (rinviati alla fase Capacitor).
function TimerPill() {
  const { status, color, formatted } = useTimer()
  const location = useLocation()
  const navigate = useNavigate()

  if (status === 'idle') return null
  if (location.pathname === '/timer') return null

  return (
    <button
      onClick={() => navigate('/timer')}
      className="fixed left-1/2 -translate-x-1/2 bottom-24 z-20 flex items-center gap-2 rounded-full pl-3 pr-4 py-2 backdrop-blur-md border border-[color:var(--border-1)] shadow-lg"
      style={{ backgroundColor: 'color-mix(in srgb, var(--navbar) 85%, transparent)' }}
    >
      <IoStopwatch className="text-lg" style={{ color }} />
      <span className="font-bold tabular-nums text-sm" style={{ color }}>{formatted}</span>
    </button>
  )
}

export default TimerPill
