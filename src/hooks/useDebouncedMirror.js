import { useEffect, useRef } from 'react'
import { syncStarted, syncOk, syncFailed } from '../data/syncStatus'

export const MIRROR_DELAY = 800 // ms di quiete prima di rispecchiare (accorpa le raffiche)

// Rispecchia un valore sul cloud con debounce, SENZA perdere l'ultima modifica.
//
// IL BUG CHE RISOLVE. La versione precedente era un semplice
//     const h = setTimeout(push, 800); return () => clearTimeout(h)
// dentro un hook che vive in una PAGINA. Se si lasciava quella pagina entro 800ms
// dall'ultima modifica, il cleanup annullava il timeout e il push non avveniva mai:
// la modifica restava in locale e non arrivava su Supabase. Sul telefono era ancora
// piu' facile, perche' mandare l'app in background sospende i timer.
// Le sessioni di allenamento si salvavano perche' partono da un contesto globale,
// che non si smonta: da qui l'asimmetria che si vedeva nel database.
//
// Qui il valore in attesa vive in un ref e viene spinto SUBITO quando:
//   - scade il debounce (caso normale);
//   - il componente si smonta (cambio pagina);
//   - la scheda passa in background o si chiude (visibilitychange / pagehide),
//     che sul telefono e' il caso piu' frequente.
export function useDebouncedMirror(value, push, enabled, delay = MIRROR_DELAY, scope = 'dati') {
  const pending = useRef(null) // { value } da spingere, oppure null se non c'e' nulla
  const pushRef = useRef(push)
  const flushRef = useRef(null)

  // I ref si scrivono negli effect, mai durante il render (react-hooks/refs).
  useEffect(() => {
    pushRef.current = push
  })

  useEffect(() => {
    flushRef.current = () => {
      const p = pending.current
      if (!p) return
      pending.current = null
      syncStarted(scope)
      Promise.resolve(pushRef.current(p.value))
        .then(() => syncOk(scope))
        .catch(err => {
          // Il dato resta salvato in locale: il fallimento non perde nulla, ma va MOSTRATO.
          console.error(`Sync ${scope}: mirror fallito, il dato resta in locale:`, err)
          syncFailed(scope, err)
        })
    }
  })

  useEffect(() => {
    if (!enabled) {
      pending.current = null // es. logout: non spingere dati del vecchio utente
      return undefined
    }
    pending.current = { value }
    const handle = setTimeout(() => flushRef.current?.(), delay)
    return () => clearTimeout(handle)
  }, [value, enabled, delay])

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushRef.current?.()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
      flushRef.current?.() // smontaggio: spingi cio' che era ancora in attesa
    }
  }, [])
}
