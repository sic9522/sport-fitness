// Palette dell'app, generate come design system su Stitch (progetto "FitPulse Design
// System & UI Kit"). Tutte condividono la stessa filosofia — "High-Performance Calm":
// base scura, accento riservato ai soli elementi interattivi e ai dati importanti,
// nessuna aggressivita' sportiva — e cambiano solo la tinta.
//
// A differenza di prima, un tema NON e' piu' il solo accento: porta l'intera scala di
// superfici, cosi' cambiando palette cambia davvero l'atmosfera dell'app e non un
// dettaglio. `dark` e `light` sono le due varianti; il tema attivo decide quale usare.
// Scala NEUTRA condivisa da tutte le palette. La tinta resta solo nell'accento: è la
// scelta tipica degli strumenti professionali (una tela neutra, un solo colore che
// segnala l'azione) e evita che lo sfondo colorato "sporchi" i dati e le fotografie.
// I gradini sono percettivamente regolari, così le card si staccano dallo sfondo senza
// bisogno di ombre marcate — il "tonal layering" previsto dal design system.
const NEUTRAL_DARK = {
  bg: '#0F1011',        // base, il livello più profondo
  surface: '#17181A',   // card
  surface2: '#0A0B0C',  // input e sfondi incassati
  surface3: '#1F2124',  // hover, popover, stati attivi
  text: '#EDEEF0',
}

const NEUTRAL_LIGHT = {
  bg: '#F7F7F8',
  surface: '#FFFFFF',
  surface2: '#EFEFF1',
  surface3: '#E4E5E8',
  text: '#17181A',
}

const palette = (id, name, accent, onAccent) => ({
  id, name, accent, onAccent, dark: NEUTRAL_DARK, light: NEUTRAL_LIGHT,
})

export const themes = [
  palette('lime', 'Lumina Kinetic', '#CCFF00', '#141500'),
  palette('cobalt', 'Cobalt Precision', '#2F6FED', '#FFFFFF'),
  palette('teal', 'Clinical Teal', '#0FB5A5', '#04211E'),
  palette('copper', 'Copper Bronze', '#C88A3F', '#1A1206'),
  palette('indigo', 'Indigo Quiet', '#7C74F0', '#FFFFFF'),
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
