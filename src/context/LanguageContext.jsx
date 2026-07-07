import { createContext, useContext, useState, useEffect } from 'react'
import { translations, languages, defaultLang } from '../i18n/translations'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('fitpulse-lang')
    return translations[saved] ? saved : defaultLang
  })

  useEffect(() => {
    localStorage.setItem('fitpulse-lang', lang)
    document.documentElement.lang = lang
  }, [lang])

  // t('chiave') → testo tradotto. t('chiave', { n: 3 }) sostituisce {n} con 3.
  // Fallback: lingua corrente → italiano → la chiave stessa (per non rompere la UI).
  function t(key, params) {
    const dict = translations[lang] || translations[defaultLang]
    let str = dict[key] ?? translations[defaultLang][key] ?? key
    if (params) {
      for (const p in params) str = str.replaceAll(`{${p}}`, params[p])
    }
    return str
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, languages }}>
      {children}
    </LanguageContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLang() {
  return useContext(LanguageContext)
}
