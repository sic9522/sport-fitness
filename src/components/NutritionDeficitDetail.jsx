// Versione INGRANDITA del grafico deficit (aperta con doppio tap/click).
// Piano cartesiano: asse X = giorni del mese, asse Y con "Deficit kcal" in alto e
// "Surplus kcal" in basso (scritte verticali), zero ESATTAMENTE al centro dell'asse Y
// (scala simmetrica). Andamento fluttuante. SVG inline, tema-aware, responsive.
const W = 360
const H = 280
const M = { left: 30, right: 14, top: 18, bottom: 28 }

function NutritionDeficitDetail({ values, unit = 'kcal', deficitLabel = 'Deficit', surplusLabel = 'Surplus' }) {
  const n = values.length
  const plotL = M.left
  const plotR = W - M.right
  const plotT = M.top
  const plotB = H - M.bottom
  const midY = (plotT + plotB) / 2
  const bound = Math.max(1, ...values.map(v => Math.abs(v)))

  const xFor = i => (n <= 1 ? (plotL + plotR) / 2 : plotL + (i / (n - 1)) * (plotR - plotL))
  const yFor = v => midY - (v / bound) * ((plotB - plotT) / 2)

  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(v).toFixed(1)}`).join(' ')

  // Etichette giorni sull'asse X (~6, per non affollare).
  const step = Math.max(1, Math.ceil(n / 6))
  const dayTicks = []
  for (let i = 0; i < n; i += step) dayTicks.push(i)
  if (dayTicks[dayTicks.length - 1] !== n - 1 && n > 1) dayTicks.push(n - 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" role="img"
      aria-label={`${deficitLabel} / ${surplusLabel} ${unit}`} className="block" style={{ height: 'auto' }}>

      {/* Assi */}
      <line x1={plotL} y1={plotT} x2={plotL} y2={plotB} stroke="var(--border-2)" strokeWidth="1" />
      <line x1={plotL} y1={plotB} x2={plotR} y2={plotB} stroke="var(--border-2)" strokeWidth="1" />
      {/* Zero al centro (separa deficit sopra / surplus sotto) */}
      <line x1={plotL} y1={midY} x2={plotR} y2={midY} stroke="var(--text-faint)" strokeWidth="1" strokeDasharray="3 3" />

      {/* Etichette verticali dell'asse Y */}
      <text transform={`rotate(-90 11 ${(plotT + midY) / 2})`} x="11" y={(plotT + midY) / 2}
        textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--text-muted)">{deficitLabel} {unit}</text>
      <text transform={`rotate(-90 11 ${(midY + plotB) / 2})`} x="11" y={(midY + plotB) / 2}
        textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--text-muted)">{surplusLabel} {unit}</text>

      {/* Etichette giorni sull'asse X */}
      {dayTicks.map(i => (
        <text key={i} x={xFor(i)} y={plotB + 14} textAnchor="middle" fontSize="8" fill="var(--text-dim)">{i + 1}</text>
      ))}

      {/* Andamento fluttuante + punti */}
      {n >= 2 && (
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      )}
      {values.map((v, i) => (
        <circle key={i} cx={xFor(i)} cy={yFor(v)} r="1.8" fill="var(--accent)" />
      ))}
    </svg>
  )
}

export default NutritionDeficitDetail
