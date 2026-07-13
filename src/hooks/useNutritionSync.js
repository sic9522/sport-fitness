import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { fetchDiary, replaceDiary, fetchGoals, upsertGoals } from '../services/nutrition'
import {
  saveDiario, saveNutritionGoals, DEFAULT_NUTRITION_GOALS,
  loadDiarioOwner, saveDiarioOwner, diarioHasData,
} from '../data/nutritionDefaults'

const MIRROR_DELAY = 800 // ms di quiete prima di rispecchiare (accorpa modifiche in raffica)

// Ponte LOCAL-FIRST + MIRROR per DIARIO e OBIETTIVI nutrizionali, speculare a
// useWorkoutSync. localStorage resta il motore: l'app funziona offline e da non
// loggati come prima. Da loggato:
//   1) RICONCILIAZIONE una-tantum al login (pull dal DB, oppure adozione dei dati
//      anonimi locali se il DB e' vuoto);
//   2) MIRROR su Supabase a ogni modifica (debounce): diario via replaceDiary
//      (full-replace), obiettivi via upsertGoals.
// No-op se Supabase non e' configurato. Un unico marcatore `fitpulse-diario-owner`
// governa entrambi (diario + obiettivi) per non mischiare i dati di utenti diversi
// sullo stesso browser.
export function useNutritionSync(diario, setDiario, goals, setGoals) {
  const { user } = useAuth()

  // Snapshot aggiornati letti dalla riconciliazione al login, senza mettere
  // diario/goals fra le dipendenze (che la farebbero ripartire a ogni modifica).
  const diarioRef = useRef(diario)
  const goalsRef = useRef(goals)
  useEffect(() => {
    diarioRef.current = diario
  }, [diario])
  useEffect(() => {
    goalsRef.current = goals
  }, [goals])

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
        const [remoteDiario, remoteGoals] = await Promise.all([fetchDiary(), fetchGoals()])
        if (!alive) return
        const localDiario = diarioRef.current
        const localGoals = goalsRef.current
        const owner = loadDiarioOwner()
        const ownedByMe = owner === null || owner === user.id

        // --- Diario ---
        if (diarioHasData(remoteDiario)) {
          setDiario(remoteDiario)
          saveDiario(remoteDiario)
        } else if (diarioHasData(localDiario) && ownedByMe) {
          await replaceDiary(user.id, localDiario)
        } else {
          setDiario({})
          saveDiario({})
        }

        // --- Obiettivi ---
        if (remoteGoals) {
          setGoals(remoteGoals)
          saveNutritionGoals(remoteGoals)
        } else if (ownedByMe) {
          await upsertGoals(user.id, localGoals)
        } else {
          // Diario di un altro utente sullo stesso browser: non ereditare i suoi obiettivi.
          setGoals(DEFAULT_NUTRITION_GOALS)
          saveNutritionGoals(DEFAULT_NUTRITION_GOALS)
        }

        saveDiarioOwner(user.id)
        readyFor.current = user.id
      } catch (err) {
        console.error('Sync nutrizione (riconciliazione) fallita:', err)
        startedFor.current = null // il locale resta valido; consenti un nuovo tentativo
      }
    })()

    return () => {
      alive = false
    }
  }, [user, setDiario, setGoals])

  // 2a) Mirror del diario a ogni modifica, solo dopo la riconciliazione.
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return undefined
    if (readyFor.current !== user.id) return undefined
    const handle = setTimeout(() => {
      replaceDiary(user.id, diario).catch(err =>
        console.error('Sync diario (mirror) fallito:', err))
    }, MIRROR_DELAY)
    return () => clearTimeout(handle)
  }, [diario, user])

  // 2b) Mirror degli obiettivi a ogni modifica, solo dopo la riconciliazione.
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return undefined
    if (readyFor.current !== user.id) return undefined
    const handle = setTimeout(() => {
      upsertGoals(user.id, goals).catch(err =>
        console.error('Sync obiettivi (mirror) fallito:', err))
    }, MIRROR_DELAY)
    return () => clearTimeout(handle)
  }, [goals, user])
}
