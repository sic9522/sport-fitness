import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { themes, themeById, cssVarsFor } from '../themes'

const ThemeContext = createContext(null)

const THEME_KEY = 'fitpulse-theme'
const MODE_KEY = 'fitpulse-theme-mode' // 'dark' | 'light'

// Durata della dissolvenza e del velo (vedi index.css). Il timer che toglie le
// classi deve durare quanto l'animazione piu' lunga: il raggio di luce.
const SWITCH_MS = 1600

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => themeById(localStorage.getItem(THEME_KEY)))
  const [mode, setMode] = useState(() => (localStorage.getItem(MODE_KEY) === 'light' ? 'light' : 'dark'))
  const prevMode = useRef(mode)
  const switchTimer = useRef(null)

  // Passaggio chiaro/scuro: dissolvenza lunga + velo (lampo verso il buio,
  // raggio verso la luce). Tutto in classi sull'<html>, niente stato React: e'
  // un effetto che riguarda la pagina intera e dura piu' di un render.
  //
  // Al PRIMO montaggio non si anima: aprire l'app non e' un cambio di tema, e
  // un lampo all'avvio sarebbe solo un difetto.
  useEffect(() => {
    if (prevMode.current === mode) return undefined
    prevMode.current = mode

    const root = document.documentElement
    const flash = mode === 'dark' ? 'theme-flash-dark' : 'theme-flash-light'
    // Le classi si tolgono e si rimettono forzando un reflow: senza, ripremere
    // il toggle prima della fine non farebbe ripartire l'animazione.
    root.classList.remove('theme-switching', 'theme-flash-dark', 'theme-flash-light')
    void root.offsetWidth
    root.classList.add('theme-switching', flash)

    clearTimeout(switchTimer.current)
    switchTimer.current = setTimeout(() => {
      root.classList.remove('theme-switching', 'theme-flash-dark', 'theme-flash-light')
    }, SWITCH_MS)

    // Il timer si azzera al prossimo cambio (o allo smontaggio): quello nuovo
    // lo rimpiazza subito dopo.
    return () => clearTimeout(switchTimer.current)
  }, [mode])

  // Una palette porta l'INTERA scala di superfici, non il solo accento: cambiando tema
  // cambia lo sfondo, le card e il testo. I token semantici derivati (bordi, riempimenti,
  // testi attenuati) restano in index.css e seguono data-theme.
  useEffect(() => {
    const root = document.documentElement
    for (const [name, value] of Object.entries(cssVarsFor(theme, mode))) {
      root.style.setProperty(name, value)
    }
    root.dataset.theme = mode
    localStorage.setItem(THEME_KEY, theme.id)
    localStorage.setItem(MODE_KEY, mode)
  }, [theme, mode])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  return useContext(ThemeContext)
}

