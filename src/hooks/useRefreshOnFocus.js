import { useEffect, useState, useRef } from 'react'

const MIN_INTERVAL = 10_000 // ms fra due ri-letture: il focus scatta spesso

// Incrementa un contatore quando l'app torna in PRIMO PIANO.
//
// Perche' serve: la riconciliazione (il pull dal cloud) avveniva solo al primo montaggio
// della pagina. Un dispositivo lasciato aperto non vedeva quindi MAI le modifiche fatte
// altrove: creavi una scheda sul telefono e sul PC non compariva finche' non ricaricavi.
// Questo e' proprio il gesto reale dell'utente — creo qui, poi passo di la' — quindi il
// ritorno in primo piano e' il momento giusto per ri-leggere.
//
// Il throttle evita di rifare il pull a ogni singolo cambio di finestra o scheda.
export function useRefreshOnFocus(minInterval = MIN_INTERVAL) {
  const [tick, setTick] = useState(0)
  const lastAt = useRef(0)

  useEffect(() => {
    // Il montaggio ha gia' riconciliato: parte l'orologio da adesso, cosi' il primo
    // focus subito successivo non provoca un pull doppio e inutile.
    lastAt.current = Date.now()

    const bump = () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastAt.current < minInterval) return
      lastAt.current = now
      setTick(n => n + 1)
    }

    document.addEventListener('visibilitychange', bump)
    window.addEventListener('focus', bump)
    return () => {
      document.removeEventListener('visibilitychange', bump)
      window.removeEventListener('focus', bump)
    }
  }, [minInterval])

  return tick
}
