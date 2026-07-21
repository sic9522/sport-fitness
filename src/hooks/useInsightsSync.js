import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { fetchHydration, replaceHydration, fetchHydrationGoal, upsertHydrationGoal } from '../services/hydration'
import { fetchSessions, replaceSessions } from '../services/workoutSessions'
import { saveHydration, saveHydrationGoal, hydrationHasData, DEFAULT_HYDRATION_GOAL_ML } from '../data/hydrationDefaults'
import { saveWorkoutLog, workoutLogHasData } from '../data/workoutLog'
import { loadInsightsOwner, saveInsightsOwner } from '../data/insightsOwner'

const MIRROR_DELAY = 800 // ms di quiete prima di rispecchiare (accorpa modifiche in raffica)

// Ponte LOCAL-FIRST + MIRROR per IDRATAZIONE e ALLENAMENTI SVOLTI, sullo stesso modello
// di useNutritionSync. localStorage resta il motore: l'app funziona offline e da non
// loggati come prima. Da loggato:
//   1) RICONCILIAZIONE una-tantum al login (pull dal DB, oppure adozione dei dati
//      anonimi locali se il DB è vuoto);
//   2) MIRROR su Supabase a ogni modifica (debounce), con full-replace.
// No-op se Supabase non è configurato.
export function useInsightsSync(hydration, setHydration, goalMl, setGoalMl, log, setLog) {
  const { user } = useAuth()

  // Snapshot aggiornati per la riconciliazione, senza mettere i dati fra le dipendenze
  // (li farebbero ripartire a ogni modifica).
  const hydrationRef = useRef(hydration)
  const goalRef = useRef(goalMl)
  const logRef = useRef(log)
  useEffect(() => { hydrationRef.current = hydration }, [hydration])
  useEffect(() => { goalRef.current = goalMl }, [goalMl])
  useEffect(() => { logRef.current = log }, [log])

  const startedFor = useRef(null) // login già in riconciliazione (evita doppioni)
  const readyFor = useRef(null)   // riconciliazione COMPLETATA → il mirror può partire

  // 1) Riconciliazione una-tantum per utente loggato.
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    if (!user) {
      // Logout: azzero i marcatori così il prossimo login riconcilia da capo.
      startedFor.current = null
      readyFor.current = null
      return undefined
    }
    if (startedFor.current === user.id) return undefined
    startedFor.current = user.id

    let alive = true
    ;(async () => {
      try {
        const [remoteHydration, remoteGoal, remoteLog] = await Promise.all([
          fetchHydration(), fetchHydrationGoal(), fetchSessions(),
        ])
        if (!alive) return
        const owner = loadInsightsOwner()
        const ownedByMe = owner === null || owner === user.id

        // --- Idratazione ---
        if (hydrationHasData(remoteHydration)) {
          setHydration(remoteHydration)
          saveHydration(remoteHydration)
        } else if (hydrationHasData(hydrationRef.current) && ownedByMe) {
          await replaceHydration(user.id, hydrationRef.current)
        } else {
          setHydration({})
          saveHydration({})
        }

        // --- Obiettivo idratazione ---
        if (remoteGoal) {
          setGoalMl(remoteGoal)
          saveHydrationGoal(remoteGoal)
        } else if (ownedByMe) {
          await upsertHydrationGoal(user.id, goalRef.current)
        } else {
          // Dati di un altro utente sullo stesso browser: non ereditare il suo obiettivo.
          setGoalMl(DEFAULT_HYDRATION_GOAL_ML)
          saveHydrationGoal(DEFAULT_HYDRATION_GOAL_ML)
        }

        // --- Allenamenti svolti ---
        if (workoutLogHasData(remoteLog)) {
          setLog(remoteLog)
          saveWorkoutLog(remoteLog)
        } else if (workoutLogHasData(logRef.current) && ownedByMe) {
          await replaceSessions(user.id, logRef.current)
        } else {
          setLog([])
          saveWorkoutLog([])
        }

        saveInsightsOwner(user.id)
        readyFor.current = user.id
      } catch (err) {
        console.error('Sync statistiche (riconciliazione) fallita:', err)
        startedFor.current = null // il locale resta valido; consenti un nuovo tentativo
      }
    })()

    return () => { alive = false }
  }, [user, setHydration, setGoalMl, setLog])

  // 2a) Mirror dell'idratazione a ogni modifica, solo dopo la riconciliazione.
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return undefined
    if (readyFor.current !== user.id) return undefined
    const handle = setTimeout(() => {
      replaceHydration(user.id, hydration).catch(err =>
        console.error('Sync idratazione (mirror) fallito:', err))
    }, MIRROR_DELAY)
    return () => clearTimeout(handle)
  }, [hydration, user])

  // 2b) Mirror dell'obiettivo.
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return undefined
    if (readyFor.current !== user.id) return undefined
    const handle = setTimeout(() => {
      upsertHydrationGoal(user.id, goalMl).catch(err =>
        console.error('Sync obiettivo idratazione (mirror) fallito:', err))
    }, MIRROR_DELAY)
    return () => clearTimeout(handle)
  }, [goalMl, user])

  // 2c) Mirror del registro allenamenti.
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return undefined
    if (readyFor.current !== user.id) return undefined
    const handle = setTimeout(() => {
      replaceSessions(user.id, log).catch(err =>
        console.error('Sync allenamenti (mirror) fallito:', err))
    }, MIRROR_DELAY)
    return () => clearTimeout(handle)
  }, [log, user])
}
