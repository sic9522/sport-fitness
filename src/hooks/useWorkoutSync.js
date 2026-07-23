import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { fetchWorkoutDays, replaceWorkoutDays } from '../services/workouts'
import { saveGiornate, loadGiornateOwner, saveGiornateOwner } from '../data/giornateDefaults'
import { useDebouncedMirror } from './useDebouncedMirror'
import { syncFailed } from '../data/syncStatus'
import { useRefreshOnFocus } from './useRefreshOnFocus'

// Ponte LOCAL-FIRST + MIRROR per le GIORNATE di Palestra.
// localStorage resta il motore: l'app funziona offline e da non loggati esattamente come
// prima. Da loggato aggiunge due comportamenti:
//   1) RICONCILIAZIONE una-tantum al login (pull dal DB, oppure adozione dei dati anonimi
//      locali se il DB e' vuoto);
//   2) MIRROR su Supabase a ogni modifica (debounce), con full-replace via replaceWorkoutDays.
// Nota: replaceWorkoutDays riscrive TUTTE le giornate a ogni push (delete+insert). Al numero
// di giornate/schede di un utente e' accettabile; un giorno si potra' passare a un diff.
export function useWorkoutSync(giornate, setGiornate) {
  const { user } = useAuth()

  // Snapshot sempre aggiornato: la riconciliazione legge il locale al momento del login
  // senza dover mettere `giornate` nelle sue dipendenze (che la farebbe ripartire a ogni edit).
  // Aggiornato in un effect (scrivere un ref durante il render e' vietato — react-hooks/refs).
  const giornateRef = useRef(giornate)
  useEffect(() => {
    giornateRef.current = giornate
  }, [giornate])

  // Ri-legge dal cloud a ogni ritorno in primo piano: senza questo un dispositivo
  // lasciato aperto non vedrebbe mai le schede create su un altro.
  const refreshTick = useRefreshOnFocus()

  const startedFor = useRef(null) // riconciliazione gia' in corso per questa chiave
  // Riconciliazione COMPLETATA. E' STATO, non un ref: al termine il mirror deve
  // rivalutare la propria condizione, cosa che un ref non provoca.
  const [readyFor, setReadyFor] = useState(null)

  // 1) Riconciliazione una-tantum per utente loggato.
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    if (!user) {
      // Logout: basta azzerare questo, cosi' il prossimo login riconcilia da capo.
      // `readyFor` non si tocca: senza utente il mirror e' gia' disattivato, e resettarlo
      // qui sarebbe un setState sincrono dentro un effect (vietato in React 19).
      startedFor.current = null
      return undefined
    }
    // La chiave include refreshTick: al ritorno in primo piano cambia, quindi la
    // riconciliazione riparte e il cloud torna a essere la fonte di verita'.
    const runKey = `${user.id}:${refreshTick}`
    if (startedFor.current === runKey) return undefined
    startedFor.current = runKey

    let alive = true
    let done = false // riconciliazione portata a termine (vedi cleanup)
    ;(async () => {
      try {
        const remote = await fetchWorkoutDays()
        if (!alive) return
        const local = giornateRef.current
        const owner = loadGiornateOwner()

        if (remote.length > 0) {
          // Il DB ha gia' i dati di questo utente -> diventano il locale.
          setGiornate(remote)
          saveGiornate(remote)
        } else if (local.length > 0 && (owner === null || owner === user.id)) {
          // DB vuoto + dati locali anonimi (primo login) o gia' di questo utente -> li carico su.
          await replaceWorkoutDays(user.id, local)
        } else {
          // DB vuoto e locale di un ALTRO utente (o nessun dato) -> parto pulito per questo utente.
          setGiornate([])
          saveGiornate([])
        }
        saveGiornateOwner(user.id)
        setReadyFor(user.id)
        done = true
      } catch (err) {
        // Se la riconciliazione fallisce il mirror NON si attiva mai: e' il caso in cui
        // "le schede restano sul telefono e non salgono". Va reso visibile, non solo loggato.
        console.error('Sync giornate (riconciliazione) fallita:', err)
        syncFailed('giornate (riconciliazione)', err)
        startedFor.current = null // il locale resta valido; consenti un nuovo tentativo
      }
    })()

    return () => {
      alive = false
      // Se la riconciliazione NON e' arrivata in fondo, va riaperta la porta al prossimo
      // tentativo. Senza questo, in StrictMode (doppio mount in sviluppo) accadeva:
      // run 1 marca startedFor e avvia il fetch -> cleanup mette alive=false -> run 2
      // trova startedFor gia' impostato ed esce -> il fetch della run 1 torna, vede
      // alive=false ed esce prima di setReadyFor. Esito: `readyFor` mai impostato, mirror
      // mai attivo, nessun errore. Il sync restava muto per l'intera sessione.
      if (!done) startedFor.current = null
    }
  }, [user, setGiornate, refreshTick])

  // 2) Mirror a ogni modifica, solo dopo che la riconciliazione e' finita. Il push non si
  // perde se si lascia la pagina o l'app va in background: se ne occupa useDebouncedMirror.
  const push = useCallback(g => replaceWorkoutDays(user.id, g), [user])
  useDebouncedMirror(
    giornate,
    push,
    Boolean(isSupabaseConfigured && user && readyFor === user.id),
    undefined,
    'giornate',
  )
}
