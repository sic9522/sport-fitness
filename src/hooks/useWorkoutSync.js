import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { fetchWorkoutDays, replaceWorkoutDays } from '../services/workouts'
import { saveGiornate, loadGiornateOwner, saveGiornateOwner } from '../data/giornateDefaults'

const MIRROR_DELAY = 800 // ms di quiete prima di rispecchiare (accorpa modifiche in raffica)

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

  const startedFor = useRef(null) // login gia' in riconciliazione (evita doppioni)
  const readyFor = useRef(null)   // riconciliazione COMPLETATA -> il mirror puo' partire

  // 1) Riconciliazione una-tantum per utente loggato.
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    if (!user) {
      // Logout: azzero i marcatori cosi' il prossimo login riconcilia da capo.
      startedFor.current = null
      readyFor.current = null
      return undefined
    }
    if (startedFor.current === user.id) return undefined
    startedFor.current = user.id

    let alive = true
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
        readyFor.current = user.id
      } catch (err) {
        console.error('Sync giornate (riconciliazione) fallita:', err)
        startedFor.current = null // il locale resta valido; consenti un nuovo tentativo
      }
    })()

    return () => {
      alive = false
    }
  }, [user, setGiornate])

  // 2) Mirror su Supabase a ogni modifica, solo dopo che la riconciliazione e' finita.
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return undefined
    if (readyFor.current !== user.id) return undefined
    const handle = setTimeout(() => {
      replaceWorkoutDays(user.id, giornate).catch(err =>
        console.error('Sync giornate (mirror) fallito:', err))
    }, MIRROR_DELAY)
    return () => clearTimeout(handle)
  }, [giornate, user])
}
