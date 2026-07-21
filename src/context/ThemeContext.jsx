import { createContext, useContext, useState, useEffect } from 'react'
import { themes, themeById, cssVarsFor } from '../themes'

const ThemeContext = createContext(null)

const THEME_KEY = 'fitpulse-theme'
const MODE_KEY = 'fitpulse-theme-mode' // 'dark' | 'light'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => themeById(localStorage.getItem(THEME_KEY)))
  const [mode, setMode] = useState(() => (localStorage.getItem(MODE_KEY) === 'light' ? 'light' : 'dark'))

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

