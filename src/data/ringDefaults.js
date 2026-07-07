export const DEFAULT_RINGS = [
  { id: 'ring1', label: 'Calorie',  labelKey: 'ring.calorie', color: '#CCFF00', current: 1450, target: 2000, unit: 'Kcal' },
  { id: 'ring2', label: 'Acqua',    labelKey: 'ring.acqua',   color: '#00D4FF', current: 1.2,  target: 2.5,  unit: 'l'    },
  { id: 'ring3', label: 'Workout',  labelKey: 'ring.workout', color: '#FF6B35', current: 35,   target: 60,   unit: 'min'  },
]

// Carica gli anelli partendo dai default e sovrascrivendo SOLO il colore salvato:
// così label, unità e traduzioni restano sempre allineate ai default,
// anche per config salvate prima di queste modifiche.
export function loadRings() {
  const saved = localStorage.getItem('fitpulse-ring-config')
  const savedRings = saved ? JSON.parse(saved) : []
  return DEFAULT_RINGS.map(def => {
    const s = savedRings.find(r => r.id === def.id)
    return { ...def, color: s?.color ?? def.color }
  })
}
