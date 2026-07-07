export const themes = [
  { id: 'lime',   name: 'Electric Lime',  accent: '#CCFF00', onAccent: '#111508' },
  { id: 'blue',   name: 'Electric Blue',  accent: '#007AFF', onAccent: '#ffffff' },
  { id: 'purple', name: 'Deep Purple',    accent: '#AF52DE', onAccent: '#ffffff' },
  { id: 'pink',   name: 'Neon Pink',      accent: '#FF007F', onAccent: '#ffffff' },
  { id: 'red',    name: 'Classic Red',    accent: '#FF3B30', onAccent: '#ffffff' },
]

export const defaultTheme = themes[0]

// True se il colore (hex #rrggbb) è "chiaro" → usato per decidere tema chiaro/scuro.
// Usa la luminanza percepita (0–255): sopra 140 lo consideriamo chiaro.
export function isLightColor(hex) {
  const h = hex.replace('#', '')
  if (h.length < 6) return false
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b > 140
}
