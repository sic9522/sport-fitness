import { useRef, useEffect, useMemo } from 'react'

// Wheel picker stile iPhone: colonna scrollabile con scroll-snap, la riga
// centrale è quella selezionata. Formato mm:ss, step configurabile.
const ITEM_H = 46      // altezza di ogni riga (px)
const VISIBLE = 3      // righe visibili (dispari: la centrale è selezionata)
const WIDTH = 103      // larghezza della colonna (px)
const SCROLLBAR_W = 10 // px: unica fonte: passata al CSS via --wheel-sb e usata per
                       // rientrare la banda, così la scrollbar resta tutta a destra

function mmss(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// `onPick` (opzionale) viene chiamato quando si CLICCA una riga: il valore è scelto
// e confermato (chi lo usa può chiudere il picker). Lo scroll da solo non lo chiama.
function TimerWheel({ value, onChange, onPick, max = 180, step = 5 }) {
  const scrollRef = useRef(null)
  const settleRef = useRef(null)
  useEffect(() => () => clearTimeout(settleRef.current), [])

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

  // Click su una riga (anche non centrata): ci scorre sopra, la seleziona e conferma.
  function pick(idx) {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' })
    if (options[idx] !== value) onChange(options[idx])
    onPick?.(options[idx])
  }

  return (
    <div
      className="relative shrink-0"
      style={{ width: WIDTH, height: ITEM_H * VISIBLE, '--wheel-sb': `${SCROLLBAR_W}px` }}
    >
      {/* Banda della riga selezionata: si ferma PRIMA della scrollbar (non le passa sotto) */}
      <div
        className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 rounded-lg bg-[var(--fill-1)] border-y border-[color:var(--border-2)]"
        style={{ height: ITEM_H, right: SCROLLBAR_W }}
      />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll snap-y snap-mandatory thin-scrollbar"
      >
        {/* Spaziatore: permette alla prima/ultima riga di arrivare al centro */}
        <div style={{ height: ITEM_H }} />
        {options.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => pick(i)}
            className="w-full flex items-center justify-center tabular-nums font-semibold text-[color:var(--text)] snap-center"
            style={{ height: ITEM_H }}
          >
            {mmss(s)}
          </button>
        ))}
        <div style={{ height: ITEM_H }} />
      </div>
    </div>
  )
}

export default TimerWheel
