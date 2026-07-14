// Grafico di andamento mensile del DEFICIT kcal: singola serie (accento), linea
// 2px, baseline a ZERO tratteggiata. I valori possono essere positivi (deficit,
// sotto l'obiettivo) o negativi (surplus): la linea fluttua sopra/sotto lo zero.
// SVG inline, tema-aware, responsive.
const W = 320
const H = 120
const PAD = { top: 16, right: 10, bottom: 16, left: 10 }

function NutritionTrendChart({ values, unit = 'kcal' }) {
  const n = values.length
  const max = Math.max(0, ...values)
  const min = Math.min(0, ...values)
  const span = max - min || 1

  const xFor = i => (n <= 1 ? W / 2 : PAD.left + (i / (n - 1)) * (W - PAD.left - PAD.right))
  const yFor = v => PAD.top + (1 - (v - min) / span) * (H - PAD.top - PAD.bottom)

  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(v).toFixed(1)}`).join(' ')
  const zeroY = yFor(0)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${unit}: ${Math.round(min)}…${Math.round(max)}`}
      className="block"
      style={{ height: 'auto' }}
    >
      {/* Etichette estremi (deficit in alto, surplus in basso) */}
      {max > 0 && <text x={PAD.left} y={PAD.top - 5} fontSize="9" fill="var(--text-dim)">+{Math.round(max)} {unit}</text>}
      {min < 0 && <text x={PAD.left} y={H - PAD.bottom + 11} fontSize="9" fill="var(--text-dim)">{Math.round(min)} {unit}</text>}

      {/* Baseline a zero */}
      <line x1={PAD.left} y1={zeroY} x2={W - PAD.right} y2={zeroY} stroke="var(--text-faint)" strokeWidth="1" strokeDasharray="3 3" />

      {/* Andamento fluttuante */}
      {n >= 2 && (
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      )}
      {n === 1 && <circle cx={xFor(0)} cy={yFor(values[0])} r="3" fill="var(--accent)" />}
    </svg>
  )
}

export default NutritionTrendChart
