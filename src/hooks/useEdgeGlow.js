import { useState, useEffect, useCallback, useRef } from 'react'
import { PLAYER_ANIM_MS } from '../data/playerAnimation'

// LOGICA del bordo luminoso, tenuta fuori sia dai pulsanti sia dal componente grafico:
// i pulsanti si limitano a dire "e' stata premuta questa azione", questo hook decide
// quanto dura l'effetto e quando spegnerlo, ed EdgeGlow si occupa solo di disegnarlo.
// Cosi' un'animazione futura puo' riusare lo stesso schema senza toccare i pulsanti.
//
// `run` cresce a ogni pressione: serve come chiave di rimontaggio in EdgeGlow, cosi'
// premendo due volte di fila l'animazione RIPARTE da capo invece di proseguire quella
// gia' in corso (che darebbe l'impressione di un pulsante che non risponde).
export function useEdgeGlow(duration = PLAYER_ANIM_MS) {
  const [glow, setGlow] = useState(null) // { color, run } oppure null = spento
  const runRef = useRef(0)

  const trigger = useCallback(color => {
    if (!color) return
    runRef.current += 1
    setGlow({ color, run: runRef.current })
  }, [])

  // Spegnimento automatico al termine: il bordo e' un lampo, non uno stato persistente.
  useEffect(() => {
    if (!glow) return undefined
    const handle = setTimeout(() => setGlow(null), duration)
    return () => clearTimeout(handle)
  }, [glow, duration])

  return { glow, trigger }
}
