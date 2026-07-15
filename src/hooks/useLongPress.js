import { useEffect, useRef } from 'react'

// Rileva una pressione PROLUNGATA su un elemento (default 400ms).
// Qui vive SOLO il timer: la geometria del gesto (scroll, soglie) resta a chi lo usa,
// che annulla con `cancel()` quando il puntatore si muove o viene rilasciato.
//   start()  → avvia il conteggio
//   cancel() → annulla (rilascio, scroll, smontaggio)
//   fired    → ref: true se la pressione è già scattata (per non contarla come tap)
export default function useLongPress(onLongPress, delay = 400) {
  const timerRef = useRef(null)
  const firedRef = useRef(false)
  const callbackRef = useRef(onLongPress)

  // Il callback può cambiare tra i render: lo tengo aggiornato in un effect
  // (scrivere un ref durante il render è vietato — react-hooks/refs).
  useEffect(() => {
    callbackRef.current = onLongPress
  }, [onLongPress])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function cancel() {
    clearTimeout(timerRef.current)
    timerRef.current = null
  }

  function start() {
    firedRef.current = false
    cancel()
    timerRef.current = setTimeout(() => {
      firedRef.current = true
      callbackRef.current?.()
    }, delay)
  }

  return { start, cancel, fired: firedRef }
}
