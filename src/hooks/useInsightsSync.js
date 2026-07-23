import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { fetchHydration, replaceHydration, fetchHydrationGoal, upsertHydrationGoal } from '../services/hydration'
import { fetchSessions, replaceSessions } from '../services/workoutSessions'
import { saveHydration, saveHydrationGoal, hydrationHasData, DEFAULT_HYDRATION_GOAL_ML } from '../data/hydrationDefaults'
import { saveWorkoutLog, workoutLogHasData } from '../data/workoutLog'
import { loadInsightsOwner, saveInsightsOwner } from '../data/insightsOwner'
import { useDebouncedMirror } from './useDebouncedMirror'
import { syncFailed } from '../data/syncStatus'
import { useRefreshOnFocus } from './useRefreshOnFocus'

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

  // Ri-legge dal cloud a ogni ritorno in primo piano (vedi useWorkoutSync).
  const refreshTick = useRefreshOnFocus()

  const startedFor = useRef(null) // riconciliazione già in corso per questa chiave
  // Riconciliazione COMPLETATA. È STATO, non un ref: al termine il mirror deve
  // rivalutare la propria condizione, cosa che un ref non provoca.
  const [readyFor, setReadyFor] = useState(null)

  // 1) Riconciliazione una-tantum per utente loggato.
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    if (!user) {
      // Logout: azzero i marcatori così il prossimo login riconcilia da capo.
      startedFor.current = null
      // `readyFor` non si tocca: senza utente il mirror è già disattivato, e resettarlo
      // qui sarebbe un setState sincrono dentro un effect (vietato in React 19).
      return undefined
    }
    const runKey = `${user.id}:${refreshTick}`
    if (startedFor.current === runKey) return undefined
    startedFor.current = runKey

    let alive = true
    let done = false // riconciliazione portata a termine (vedi cleanup)
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
        setReadyFor(user.id)
        done = true
      } catch (err) {
        console.error('Sync statistiche (riconciliazione) fallita:', err)
        syncFailed('statistiche (riconciliazione)', err)
        startedFor.current = null // il locale resta valido; consenti un nuovo tentativo
      }
    })()

    return () => {
      alive = false
      // Riconciliazione interrotta a metà (tipico del doppio mount di StrictMode):
      // riapre la porta al tentativo successivo, altrimenti il mirror non si attiva mai.
      if (!done) startedFor.current = null
    }
  }, [user, setHydration, setGoalMl, setLog, refreshTick])

  // 2) Mirror a ogni modifica, solo dopo la riconciliazione. Il push non si perde se si
  // lascia la pagina o l'app va in background: se ne occupa useDebouncedMirror.
  const enabled = Boolean(isSupabaseConfigured && user && readyFor === user.id)

  const pushHydration = useCallback(h => replaceHydration(user.id, h), [user])
  useDebouncedMirror(hydration, pushHydration, enabled)

  const pushGoal = useCallback(g => upsertHydrationGoal(user.id, g), [user])
  useDebouncedMirror(goalMl, pushGoal, enabled)

  const pushLog = useCallback(l => replaceSessions(user.id, l), [user])
  useDebouncedMirror(log, pushLog, enabled)
}
