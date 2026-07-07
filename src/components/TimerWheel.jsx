import { useRef, useEffect, useMemo } from 'react'

// Wheel picker stile iPhone: colonna scrollabile con scroll-snap, la riga
// centrale è quella selezionata. Formato mm:ss, step configurabile.
const ITEM_H = 34   // altezza di ogni riga (px)
const VISIBLE = 3   // righe visibili (dispari: la centrale è selezionata)

function mmss(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function TimerWheel({ value, onChange, max = 180, step = 5 }) {
  const scrollRef = useRef(null)
  const settleRef = useRef(null)

  const options = useMemo(() => {
    const arr = []
    for (let s = 0; s <= max; s += step) arr.push(s)
    return arr
  }, [max, step])

  // Posiziona lo scroll sul valore salvato al primo montaggio
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = Math.round(value / step) * ITEM_H
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Alla fine dello scroll: trova la riga centrale, aggancia e notifica il valore
  function handleScroll() {
    clearTimeout(settleRef.current)
    settleRef.current = setTimeout(() => {
      const el = scrollRef.current
      if (!el) return
      const idx = Math.max(0, Math.min(options.length - 1, Math.round(el.scrollTop / ITEM_H)))
      el.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' })
      if (options[idx] !== value) onChange(options[idx])
    }, 120)
  }

  return (
    <div className="relative shrink-0" style={{ width: 76, height: ITEM_H * VISIBLE }}>
      {/* Banda che evidenzia la riga selezionata al centro */}
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-lg bg-[var(--fill-1)] border-y border-[color:var(--border-2)]"
        style={{ height: ITEM_H }}
      />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
      >
        {/* Spaziatore: permette alla prima/ultima riga di arrivare al centro */}
        <div style={{ height: ITEM_H }} />
        {options.map(s => (
          <div
            key={s}
            className="flex items-center justify-center tabular-nums font-semibold text-[color:var(--text)] snap-center"
            style={{ height: ITEM_H }}
          >
            {mmss(s)}
          </div>
        ))}
        <div style={{ height: ITEM_H }} />
      </div>
    </div>
  )
}

export default TimerWheel
