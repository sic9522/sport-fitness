// Palette dell'app, generate come design system su Stitch (progetto "FitPulse Design
// System & UI Kit"). Tutte condividono la stessa filosofia — "High-Performance Calm":
// base scura, accento riservato ai soli elementi interattivi e ai dati importanti,
// nessuna aggressivita' sportiva — e cambiano solo la tinta.
//
// A differenza di prima, un tema NON e' piu' il solo accento: porta l'intera scala di
// superfici, cosi' cambiando palette cambia davvero l'atmosfera dell'app e non un
// dettaglio. `dark` e `light` sono le due varianti; il tema attivo decide quale usare.
export const themes = [
  {
    id: 'lime',
    name: 'Lumina Kinetic',
    accent: '#CCFF00',
    onAccent: '#111508',
    dark: { bg: '#111508', surface: '#1A1E0F', surface2: '#0C1004', surface3: '#202512', text: '#E1E5CE' },
    light: { bg: '#F6F7F2', surface: '#FFFFFF', surface2: '#EEF0E8', surface3: '#E4E6DC', text: '#1A1E0F' },
  },
  {
    id: 'cobalt',
    name: 'Cobalt Precision',
    accent: '#2F6FED',
    onAccent: '#FFFFFF',
    dark: { bg: '#0E1116', surface: '#161B22', surface2: '#0A0D11', surface3: '#1C232C', text: '#DCE3EC' },
    light: { bg: '#F4F6F9', surface: '#FFFFFF', surface2: '#E9EDF3', surface3: '#DDE3EC', text: '#0E1116' },
  },
  {
    id: 'teal',
    name: 'Clinical Teal',
    accent: '#0FB5A5',
    onAccent: '#04211E',
    dark: { bg: '#0B1416', surface: '#121D20', surface2: '#070F11', surface3: '#17262A', text: '#D6E4E4' },
    light: { bg: '#F2F7F7', surface: '#FFFFFF', surface2: '#E5EFEF', surface3: '#D8E6E6', text: '#0B1416' },
  },
  {
    id: 'copper',
    name: 'Copper Bronze',
    accent: '#C88A3F',
    onAccent: '#1A1206',
    dark: { bg: '#15120E', surface: '#1F1A14', surface2: '#0F0D09', surface3: '#29221A', text: '#E7DFD3' },
    light: { bg: '#F8F5F0', surface: '#FFFFFF', surface2: '#EFE9E0', surface3: '#E5DDD1', text: '#15120E' },
  },
  {
    id: 'indigo',
    name: 'Indigo Quiet',
    accent: '#7C74F0',
    onAccent: '#FFFFFF',
    dark: { bg: '#101018', surface: '#191926', surface2: '#0B0B12', surface3: '#212133', text: '#DEDEEA' },
    light: { bg: '#F5F5FA', surface: '#FFFFFF', surface2: '#ECECF5', surface3: '#E1E1EE', text: '#101018' },
  },
]

export const defaultTheme = themes[0]

export const themeById = id => themes.find(t => t.id === id) || defaultTheme

// True se il colore (hex #rrggbb) è "chiaro" → usato per decidere tema chiaro/scuro.
// Usa la luminanza percepita (0–255): sopra 140 lo consideriamo chiaro.
export function isLightColor(hex) {
  const h = String(hex || '').replace('#', '')
  if (h.length < 6) return false
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b > 140
}

// Variabili CSS da applicare su :root per una palette e una modalita'.
// Restituisce un oggetto piatto { '--nome': valore } cosi' il chiamante non deve
// conoscere i nomi dei token: la mappatura vive qui, in un posto solo.
export function cssVarsFor(theme, mode) {
  const p = (mode === 'light' ? theme.light : theme.dark) || theme.dark
  return {
    '--accent': theme.accent,
    '--on-accent': theme.onAccent,
    '--body-bg': p.bg,
    '--navbar': p.bg,
    '--surface': p.surface,
    '--surface-2': p.surface2,
    '--surface-3': p.surface3,
    '--text': p.text,
  }
}
