import { createContext, useContext, useState, useEffect } from 'react'
import { themes, defaultTheme, isLightColor } from '../themes'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const savedId = localStorage.getItem('fitpulse-theme')
    if (savedId === 'custom') {
      const custom = JSON.parse(localStorage.getItem('fitpulse-custom-theme') || 'null')
      if (custom) return { id: 'custom', name: 'Personalizzato', ...custom }
    }
    return themes.find(t => t.id === savedId) || defaultTheme
  })

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', theme.accent)
    document.documentElement.style.setProperty('--on-accent', theme.onAccent)
    localStorage.setItem('fitpulse-theme', theme.id)
    if (theme.id === 'custom') {
      localStorage.setItem('fitpulse-custom-theme',
        JSON.stringify({ accent: theme.accent, onAccent: theme.onAccent })
      )
    }
  }, [theme])

  // Applica navbar e sfondo body salvati all'avvio (default in index.css se assenti)
  useEffect(() => {
    const nav = localStorage.getItem('fitpulse-navbar')
    if (nav) document.documentElement.style.setProperty('--navbar', nav)

    const bodyBg = localStorage.getItem('fitpulse-body-bg') || '#111508'
    document.documentElement.style.setProperty('--body-bg', bodyBg)
    // Sfondo chiaro → tema chiaro (testo/superfici scure), altrimenti scuro
    document.documentElement.dataset.theme = isLightColor(bodyBg) ? 'light' : 'dark'
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  return useContext(ThemeContext)
}
