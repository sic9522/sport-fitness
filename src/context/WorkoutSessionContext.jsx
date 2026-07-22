import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import { buildSteps, exerciseCount, elapsedMinutes } from '../data/workoutPlayer'
import { loadWorkoutLog, saveWorkoutLog, addSession, sessionFromScheda } from '../data/workoutLog'
import { pushSession } from '../services/workoutSessions'

const DEFAULT_REST = 60 // secondi, se la scheda non ne definisce uno

const WorkoutSessionContext = createContext(null)

// Stato di una sessione di allenamento in corso, tenuto QUI e non dentro il Workout
// Player: così la sessione sopravvive quando l'utente lascia la scheda e prosegue in
// background (pill in Layout), esattamente come il timer globale.
//
// La sorgente del tempo di recupero è `restStartedAt` (istante assoluto): sia il player
// sia la pill calcolano da lì quanto manca, quindi restano allineati anche se uno dei due
// non è montato.
export function WorkoutSessionProvider({ children }) {
  const { user } = useAuth()
  const [session, setSession] = useState(null) // null = nessuna sessione attiva
  const [foreground, setForeground] = useState(false) // true = player a schermo intero
  const registeredRef = useRef(false)

  function startSession(scheda) {
    registeredRef.current = false
    setSession({
      scheda,
      steps: buildSteps(scheda),
      index: 0,
      phase: 'exercise', // exercise | rest | done
      startedAt: Date.now(),
      restStartedAt: null,
      restTotal: 0,
    })
    setForeground(true)
  }

  // Serie completata: al recupero, tranne dopo l'ultima serie → riepilogo.
  function completeSet() {
    setSession(s => {
      if (!s) return s
      if (s.index + 1 >= s.steps.length) return { ...s, phase: 'done' }
      const restTotal = Number(s.scheda?.rest) > 0 ? Number(s.scheda.rest) : DEFAULT_REST
      return { ...s, phase: 'rest', restStartedAt: Date.now(), restTotal }
    })
  }

  // Dal recupero alla serie successiva.
  function proceed() {
    setSession(s => {
      if (!s) return s
      const next = s.index + 1
      if (next >= s.steps.length) return { ...s, phase: 'done' }
      return { ...s, index: next, phase: 'exercise', restStartedAt: null }
    })
  }

  function exitSession() {
    setSession(null)
    setForeground(false)
  }

  // Registra l'allenamento UNA volta sola, al completamento. Uscendo a metà non si
  // registra nulla: non è un allenamento svolto. Il salvataggio locale è la verità;
  // il push cloud è lo specchio (fallisce in silenzio, il dato locale resta).
  useEffect(() => {
    if (session?.phase !== 'done' || registeredRef.current) return
    registeredRef.current = true
    const durationMin = elapsedMinutes(session.startedAt)
    const record = {
      ...sessionFromScheda(session.scheda, durationMin),
      exercises: exerciseCount(session.steps),
    }
    saveWorkoutLog(addSession(loadWorkoutLog(), record))
    if (user) {
      pushSession(user.id, record).catch(err =>
        console.error('Invio allenamento fallito (resta salvato in locale):', err))
    }
  }, [session, user])

  const value = {
    session,
    foreground,
    startSession,
    completeSet,
    proceed,
    exitSession,
    sendToBackground: () => setForeground(false),
    openForeground: () => setForeground(true),
  }

  return <WorkoutSessionContext.Provider value={value}>{children}</WorkoutSessionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkoutSession() {
  return useContext(WorkoutSessionContext)
}
