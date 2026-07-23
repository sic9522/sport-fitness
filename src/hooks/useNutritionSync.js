import { useEffect, useRef, useState, useCallback } from 'react'
import { useDebouncedMirror } from './useDebouncedMirror'
import { syncFailed } from '../data/syncStatus'
import { useRefreshOnFocus } from './useRefreshOnFocus'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { fetchDiary, replaceDiary, fetchGoals, upsertGoals } from '../services/nutrition'
import {
  saveDiario, saveNutritionGoals, DEFAULT_NUTRITION_GOALS,
  loadDiarioOwner, saveDiarioOwner, diarioHasData,
} from '../data/nutritionDefaults'

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

  // Ri-legge dal cloud a ogni ritorno in primo piano (vedi useWorkoutSync).
  const refreshTick = useRefreshOnFocus()

  const startedFor = useRef(null) // riconciliazione gia' in corso per questa chiave
  // Riconciliazione COMPLETATA. E' STATO, non un ref: al termine il mirror deve
  // rivalutare la propria condizione, cosa che un ref non provoca.
  const [readyFor, setReadyFor] = useState(null)

  // 1) Riconciliazione una-tantum per utente loggato.
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    if (!user) {
      // Logout: azzero i marcatori cosi' il prossimo login riconcilia da capo.
      // `readyFor` non si tocca: senza utente il mirror e' gia' disattivato, e resettarlo
      // qui sarebbe un setState sincrono dentro un effect (vietato in React 19).
      startedFor.current = null
      return undefined
    }
    const runKey = `${user.id}:${refreshTick}`
    if (startedFor.current === runKey) return undefined
    startedFor.current = runKey

    let alive = true
    let done = false // riconciliazione portata a termine (vedi cleanup)
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
        setReadyFor(user.id)
        done = true
      } catch (err) {
        console.error('Sync nutrizione (riconciliazione) fallita:', err)
        syncFailed('diario (riconciliazione)', err)
        startedFor.current = null // il locale resta valido; consenti un nuovo tentativo
      }
    })()

    return () => {
      alive = false
      // Riconciliazione interrotta a meta' (tipico del doppio mount di StrictMode):
      // riapre la porta al tentativo successivo, altrimenti il mirror non si attiva mai.
      if (!done) startedFor.current = null
    }
  }, [user, setDiario, setGoals, refreshTick])

  // 2) Mirror a ogni modifica, solo dopo la riconciliazione. Il push non si perde se si
  // lascia la pagina o l'app va in background: se ne occupa useDebouncedMirror.
  const enabled = Boolean(isSupabaseConfigured && user && readyFor === user.id)

  const pushDiario = useCallback(d => replaceDiary(user.id, d), [user])
  useDebouncedMirror(diario, pushDiario, enabled)

  const pushGoals = useCallback(g => upsertGoals(user.id, g), [user])
  useDebouncedMirror(goals, pushGoals, enabled)
}
