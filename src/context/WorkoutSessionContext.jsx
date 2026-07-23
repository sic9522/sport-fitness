import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import {
  buildSteps, exerciseCount, completedExerciseCount, completedReps, elapsedMinutes,
} from '../data/workoutPlayer'
import {
  getSchedaProgress, saveSchedaProgress, setSchedaEntry, resetSchedaEntry,
} from '../data/schedaProgress'
import { loadWorkoutLog, saveWorkoutLog, addSession, sessionFromScheda } from '../data/workoutLog'
import { pushSession } from '../services/workoutSessions'

// Recupero predefinito: unica definizione, condivisa con la stima del tempo mostrata
// sulla card. Duplicarlo avrebbe fatto divergere il tempo stimato da quello applicato.
import { DEFAULT_REST_SECONDS as DEFAULT_REST } from '../data/schedaStats'

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
    // Nuovo allenamento: il contatore della card riparte da zero, perche' mostra
    // l'ULTIMA sessione e non un totale storico.
    saveSchedaProgress(resetSchedaEntry(getSchedaProgress(), scheda?.id))
    setSession({
      scheda,
      steps: buildSteps(scheda),
      index: 0,
      phase: 'exercise', // exercise | rest | done
      startedAt: Date.now(),
      restStartedAt: null,
      restTotal: 0,
      completed: [], // indici delle serie SVOLTE (le saltate non entrano)
    })
    setForeground(true)
  }

  // Serie completata: al recupero, tranne dopo l'ultima serie → riepilogo.
  // L'indice finisce in `completed`: è la base del volume nel riepilogo, e distingue
  // ciò che è stato sollevato da ciò che è stato saltato.
  function completeSet() {
    setSession(s => {
      if (!s) return s
      const completed = s.completed?.includes(s.index) ? s.completed : [...(s.completed || []), s.index]
      if (s.index + 1 >= s.steps.length) return { ...s, completed, phase: 'done' }
      const restTotal = Number(s.scheda?.rest) > 0 ? Number(s.scheda.rest) : DEFAULT_REST
      return { ...s, completed, phase: 'rest', restStartedAt: Date.now(), restTotal }
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

  // Salta la serie corrente: passa direttamente alla successiva senza recupero. È come
  // proceed() ma parte dalla fase esercizio (l'utente non ha svolto la serie).
  const skipSet = proceed

  // Uscita dalla sessione, completata o abbandonata a meta'. Prima di scartarla si
  // fissa la durata REALE: l'effect qui sotto scrive solo quando la sessione cambia,
  // quindi senza questo passaggio resterebbe registrato il tempo dell'ultima serie
  // confermata invece di quello effettivo fino all'uscita.
  function exitSession() {
    const id = session?.scheda?.id
    if (id) {
      saveSchedaProgress(setSchedaEntry(getSchedaProgress(), id, {
        reps: completedReps(session.steps, session.completed),
        exercises: completedExerciseCount(session.steps, session.completed),
        seconds: Math.max(0, (Date.now() - Number(session.startedAt || 0)) / 1000),
      }))
    }
    setSession(null)
    setForeground(false)
  }

  // Avanzamento della card, riscritto a ogni cambio di sessione: cosi' la scheda mostra
  // le ripetizioni completate sia mentre ci si allena sia dopo, senza distinguere i due
  // casi. Sta in un effect e non dentro l'updater di stato, che deve restare puro.
  useEffect(() => {
    const id = session?.scheda?.id
    if (!id) return
    saveSchedaProgress(setSchedaEntry(getSchedaProgress(), id, {
      reps: completedReps(session.steps, session.completed),
      exercises: completedExerciseCount(session.steps, session.completed),
      seconds: Math.max(0, (Date.now() - Number(session.startedAt || 0)) / 1000),
    }))
  }, [session])

  // Registra l'allenamento UNA volta sola, al completamento. Uscendo a metà non si
  // registra nulla: non è un allenamento svolto. Il salvataggio locale è la verità;
  // il push cloud è lo specchio (fallisce in silenzio, il dato locale resta).
  useEffect(() => {
    if (session?.phase !== 'done' || registeredRef.current) return
    registeredRef.current = true
    const durationMin = elapsedMinutes(session.startedAt)
    // Si registra ciò che è stato SVOLTO: le serie saltate non fanno numero.
    const record = {
      ...sessionFromScheda(session.scheda, durationMin),
      exercises: completedExerciseCount(session.steps, session.completed) || exerciseCount(session.steps),
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
    skipSet,
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
