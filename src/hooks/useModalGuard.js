import { useState, useEffect, useRef } from 'react'

// Quanto resta a schermo "Salvataggio confermato" prima che la modale si chiuda.
const SAVED_MS = 500

// Confronta lo stato attuale della form con quello di partenza. Serve a sapere
// se c'è qualcosa da salvare: senza questo, ogni uscita chiederebbe conferma
// anche quando non si è toccato niente, e la conferma diventerebbe un riflesso
// da cliccare via (cioè inutile).
export function useDirty(snapshot) {
  const [baseline] = useState(() => JSON.stringify(snapshot))
  return JSON.stringify(snapshot) !== baseline
}

// Regole di uscita/salvataggio di una modale, in un posto solo.
//
//   Salva      -> "Salvataggio confermato" per mezzo secondo, poi chiude.
//                 Disabilitato quando non c'è nulla da salvare.
//   Ricomincia -> se ci sono dati, chiede conferma; se la form è intonsa,
//                 svuota e basta (non c'è niente da perdere).
//   X/Annulla  -> se ci sono dati, chiede "uscire senza salvare?"; altrimenti
//                 chiude subito.
//
// Nota: "Ricomincia" svuota solo la FORM. Quello che era già salvato resta dov'è
// finché non si salva davvero, quindi ricominciare e poi uscire senza salvare
// lascia la voce com'era.
export default function useModalGuard({ dirty, onSave, onCancel, onReset }) {
  const [ask, setAsk] = useState(null)     // 'exit' | 'reset' | null
  const [saved, setSaved] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  function requestSave() {
    setSaved(true)
    timer.current = setTimeout(onSave, SAVED_MS)
  }

  function requestReset() {
    if (dirty) setAsk('reset')
    else onReset?.()
  }

  function requestClose() {
    if (dirty) setAsk('exit')
    else onCancel()
  }

  function confirm() {
    const what = ask
    setAsk(null)
    if (what === 'reset') onReset?.()
    else onCancel()
  }

  return { ask, saved, requestSave, requestReset, requestClose, confirm, dismiss: () => setAsk(null) }
}
