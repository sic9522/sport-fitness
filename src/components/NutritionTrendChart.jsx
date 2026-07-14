// Grafico di andamento mensile delle kcal: singola serie (accento), linea 2px,
// linea-obiettivo tratteggiata, assi recessivi. Baseline a 0 (i giorni senza
// registrazioni valgono 0). SVG inline, tema-aware, responsive.
const W = 320
const H = 120
const PAD = { top: 16, right: 10, bottom: 12, left: 10 }

function NutritionTrendChart({ values, goal = 0, unit = 'kcal' }) {
  const n = values.length
  const max = Math.max(1, goal, ...values)

  const xFor = i => (n <= 1 ? W / 2 : PAD.left + (i / (n - 1)) * (W - PAD.left - PAD.right))
  const yFor = v => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom)

  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(v).toFixed(1)}`).join(' ')

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${unit}: max ${Math.round(max)}`}
      className="block"
      style={{ height: 'auto' }}
    >
      {/* Etichetta massimo */}
      <text x={PAD.left} y={PAD.top - 5} fontSize="9" fill="var(--text-dim)">{Math.round(max)} {unit}</text>

      {/* Linea obiettivo (tratteggiata) */}
      {goal > 0 && (
        <line
          x1={PAD.left} y1={yFor(goal)} x2={W - PAD.right} y2={yFor(goal)}
          stroke="var(--text-faint)" strokeWidth="1" strokeDasharray="3 3"
        />
      )}

      {/* Andamento */}
      {n >= 2 && (
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      )}
      {n === 1 && <circle cx={xFor(0)} cy={yFor(values[0])} r="3" fill="var(--accent)" />}
    </svg>
  )
}

export default NutritionTrendChart
