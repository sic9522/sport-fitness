// Grafico di andamento del peso: singola serie (accento), linea sottile 2px,
// griglia/assi recessivi, testo con token di testo. Serie singola → niente
// legenda (il titolo la nomina); la lista voci sotto funge da "table view".
// SVG inline, tema-aware via CSS vars, responsive (viewBox + width 100%).
const W = 320
const H = 120
const PAD = { top: 16, right: 12, bottom: 16, left: 12 }

function WeightChart({ entries, unit = 'kg' }) {
  const values = entries.map(e => e.kg)
  const n = values.length
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  const xFor = i => (n === 1 ? W / 2 : PAD.left + (i / (n - 1)) * (W - PAD.left - PAD.right))
  const yFor = v => PAD.top + (1 - (v - min) / span) * (H - PAD.top - PAD.bottom)

  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(v).toFixed(1)}`).join(' ')
  const last = n - 1

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${unit}: ${min}–${max}`}
      className="block"
      style={{ height: 'auto' }}
    >
      {/* Griglia recessiva: linee a min e max */}
      <line x1={PAD.left} y1={PAD.top} x2={W - PAD.right} y2={PAD.top} stroke="var(--border-1)" strokeWidth="1" />
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="var(--border-1)" strokeWidth="1" />
      {/* Etichette min/max (token di testo, non colore serie) */}
      <text x={PAD.left} y={PAD.top - 5} fontSize="9" fill="var(--text-dim)">{max} {unit}</text>
      <text x={PAD.left} y={H - PAD.bottom + 11} fontSize="9" fill="var(--text-dim)">{min} {unit}</text>

      {/* Linea (solo con ≥2 punti) */}
      {n >= 2 && (
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      )}
      {/* Punti; l'ultimo enfatizzato con anello di superficie 2px */}
      {values.map((v, i) => (
        <circle
          key={i}
          cx={xFor(i)}
          cy={yFor(v)}
          r={i === last ? 4.5 : 3}
          fill="var(--accent)"
          stroke={i === last ? 'var(--surface)' : 'none'}
          strokeWidth={i === last ? 2 : 0}
        />
      ))}
    </svg>
  )
}

export default WeightChart
