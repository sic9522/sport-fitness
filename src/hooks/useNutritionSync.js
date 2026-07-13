import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { fetchDiary, replaceDiary } from '../services/nutrition'
import { saveDiario, loadDiarioOwner, saveDiarioOwner, diarioHasData } from '../data/nutritionDefaults'

const MIRROR_DELAY = 800 // ms di quiete prima di rispecchiare (accorpa modifiche in raffica)

// Ponte LOCAL-FIRST + MIRROR per il DIARIO alimentare, speculare a useWorkoutSync.
// localStorage resta il motore: l'app funziona offline e da non loggati come prima.
// Da loggato aggiunge:
//   1) RICONCILIAZIONE una-tantum al login (pull dal DB, oppure adozione del diario
//      anonimo locale se il DB e' vuoto);
//   2) MIRROR su Supabase a ogni modifica (debounce), via replaceDiary (full-replace).
// No-op se Supabase non e' configurato. Gli OBIETTIVI nutrizionali NON sono ancora
// sincronizzati (manca la tabella dedicata): restano solo in localStorage.
export function useNutritionSync(diario, setDiario) {
  const { user } = useAuth()

  // Snapshot aggiornato del diario: la riconciliazione legge il locale al login senza
  // mettere `diario` fra le dipendenze (che la farebbe ripartire a ogni modifica).
  const diarioRef = useRef(diario)
  useEffect(() => {
    diarioRef.current = diario
  }, [diario])

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
        const remote = await fetchDiary()
        if (!alive) return
        const local = diarioRef.current
        const owner = loadDiarioOwner()

        if (diarioHasData(remote)) {
          // Il DB ha gia' il diario di questo utente -> diventa il locale.
          setDiario(remote)
          saveDiario(remote)
        } else if (diarioHasData(local) && (owner === null || owner === user.id)) {
          // DB vuoto + diario locale anonimo (primo login) o gia' di questo utente -> lo carico su.
          await replaceDiary(user.id, local)
        } else {
          // DB vuoto e locale di un ALTRO utente (o nessun dato) -> parto pulito.
          setDiario({})
          saveDiario({})
        }
        saveDiarioOwner(user.id)
        readyFor.current = user.id
      } catch (err) {
        console.error('Sync diario (riconciliazione) fallita:', err)
        startedFor.current = null // il locale resta valido; consenti un nuovo tentativo
      }
    })()

    return () => {
      alive = false
    }
  }, [user, setDiario])

  // 2) Mirror su Supabase a ogni modifica, solo dopo che la riconciliazione e' finita.
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return undefined
    if (readyFor.current !== user.id) return undefined
    const handle = setTimeout(() => {
      replaceDiary(user.id, diario).catch(err =>
        console.error('Sync diario (mirror) fallito:', err))
    }, MIRROR_DELAY)
    return () => clearTimeout(handle)
  }, [diario, user])
}
