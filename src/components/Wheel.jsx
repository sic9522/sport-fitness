import { useRef, useEffect } from 'react'

// Wheel picker generico (stile iPhone, come il wheel del timer): colonna scrollabile
// con scroll-snap, la riga centrale è quella selezionata. Non è legato a un formato:
// riceve `options` = [{ value, label }] già pronte.
// - `onChange`: lo scroll si ferma su una riga → notifica il valore (non conferma).
// - `onPick` (opzionale): si CLICCA una riga → valore scelto e confermato (chi lo usa
//   può chiudere il picker). Lo scroll da solo non lo chiama.
// `visible` dispari: la riga centrale è la selezionata. `scrollbar` è la larghezza (px)
// della barra: unica fonte, passata al CSS via --wheel-sb e usata per far rientrare la
// banda, così la scrollbar resta tutta a destra (stessa tecnica del timer).
function Wheel({ options, value, onChange, onPick, visible = 5, itemH = 36, width, scrollbar = 10 }) {
  const scrollRef = useRef(null)
  const settleRef = useRef(null)
  useEffect(() => () => clearTimeout(settleRef.current), [])

  const indexOf = v => options.findIndex(o => o.value === v)

  // Posiziona lo scroll sul valore selezionato al primo montaggio.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = Math.max(0, indexOf(value)) * itemH
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fine scroll: trova la riga centrale, aggancia e notifica il valore.
  function handleScroll() {
    clearTimeout(settleRef.current)
    settleRef.current = setTimeout(() => {
      const el = scrollRef.current
      if (!el) return
      const i = Math.max(0, Math.min(options.length - 1, Math.round(el.scrollTop / itemH)))
      el.scrollTo({ top: i * itemH, behavior: 'smooth' })
      if (options[i].value !== value) onChange(options[i].value)
    }, 120)
  }

  // Click su una riga (anche non centrata): ci scorre sopra, la seleziona e conferma.
  function pick(i) {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: i * itemH, behavior: 'smooth' })
    if (options[i].value !== value) onChange(options[i].value)
    onPick?.(options[i].value)
  }

  const pad = visible >> 1 // righe spaziatrici sopra/sotto (la prima/ultima arriva al centro)

  return (
    <div
      className="relative shrink-0"
      style={{ width, height: itemH * visible, '--wheel-sb': `${scrollbar}px` }}
    >
      {/* Banda della riga selezionata: si ferma PRIMA della scrollbar. Il gutter riservato
          dal browser è più largo della barra visibile, perciò la banda rientra di
          scrollbar + margine per non finirci sotto. */}
      <div
        className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 rounded-lg bg-[var(--fill-1)] border-y border-[color:var(--border-2)]"
        style={{ height: itemH, right: scrollbar + 14 }}
      />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        // scrollbarGutter: 'stable' RISERVA sempre lo spazio della barra a destra, anche
        // quando l'OS usa scrollbar in overlay (Windows): così la barra non viene mai
        // disegnata sopra le righe/banda. overflow-x-hidden esclude barre orizzontali.
        style={{ scrollbarGutter: 'stable' }}
        className="h-full overflow-y-scroll overflow-x-hidden snap-y snap-mandatory thin-scrollbar"
      >
        {Array.from({ length: pad }).map((_, i) => <div key={`t${i}`} style={{ height: itemH }} />)}
        {options.map((o, i) => (
          <button
            key={o.value}
            type="button"
            onClick={() => pick(i)}
            // `w-full` riempie ESATTAMENTE l'area utile: la scrollbar riserva il proprio
            // spazio a destra (via --wheel-sb), quindi il tasto le finisce accanto e mai
            // sotto. `overflow-x-hidden` sul contenitore esclude ogni barra orizzontale.
            className="w-full flex items-center justify-center text-xs font-semibold text-[color:var(--text)] snap-center"
            style={{ height: itemH }}
          >
            <span className="truncate">{o.label}</span>
          </button>
        ))}
        {Array.from({ length: pad }).map((_, i) => <div key={`b${i}`} style={{ height: itemH }} />)}
      </div>
    </div>
  )
}

export default Wheel
