import { useState } from 'react'

function Ring({ cx, cy, r, strokeWidth, progress, color, onClick }) {
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - Math.min(progress, 1))

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="var(--ring-track)" strokeWidth={strokeWidth} />
      {/* Arco progresso */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
      {/* Hit area invisibile — strokeWidth più largo per intercettare il click facilmente */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="transparent" strokeWidth={strokeWidth + 8} />
    </g>
  )
}

// Configurazioni pre-calcolate per 1-3 anelli (gap visivo costante di 7px)
const RING_CONFIGS = {
  1: { radii: [72],         strokeWidth: 14 },
  2: { radii: [78, 56],     strokeWidth: 13 },
  3: { radii: [82, 64, 46], strokeWidth: 11 },
}

function RingChart({ rings }) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const count = Math.min(Math.max(rings.length, 1), 3)
  const { radii, strokeWidth } = RING_CONFIGS[count]
  const cx = 100
  const cy = 100

  const selected = rings[selectedIndex] ?? rings[0]
  const pct = Math.round((selected.current / selected.target) * 100)

  return (
    <div className="relative w-52 h-52">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {rings.slice(0, 3).map((ring, i) => (
          <Ring
            key={ring.id}
            cx={cx} cy={cy}
            r={radii[i]}
            strokeWidth={strokeWidth}
            progress={ring.current / ring.target}
            color={ring.color}
            onClick={() => setSelectedIndex(i)}
          />
        ))}
      </svg>

      {/* Centro — aggiornato al click */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className="text-2xl font-extrabold transition-colors duration-300"
          style={{ color: selected.color }}
        >
          {pct}%
        </span>
        <span className="text-[color:var(--text-muted)] text-xs mt-0.5 transition-all duration-300">
          {selected.label}
        </span>
      </div>
    </div>
  )
}

export default RingChart
