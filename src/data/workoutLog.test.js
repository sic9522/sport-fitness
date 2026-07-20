import { describe, it, expect } from 'vitest'
import {
  sortSessions, addSession, removeSession, sessionsOn, minutesOn,
  estimateKcal, burnedOn, activitySeries, workoutLogHasData, STRENGTH_MET,
  elapsedSec, formatElapsed,
} from './workoutLog'

const s = (id, date, durationMin = 60) => ({ id, date, nome: 'Gambe', durationMin, exercises: 5 })

describe('sortSessions', () => {
  it('ordina dalla più recente senza mutare l’input', () => {
    const input = [s('a', '2026-07-18'), s('b', '2026-07-20')]
    expect(sortSessions(input).map(x => x.id)).toEqual(['b', 'a'])
    expect(input[0].id).toBe('a') // input intatto
  })
})

describe('addSession', () => {
  it('aggiunge riordinando per data', () => {
    const out = addSession([s('a', '2026-07-18')], s('b', '2026-07-20'))
    expect(out.map(x => x.id)).toEqual(['b', 'a'])
  })

  it('normalizza durata ed esercizi che arrivano come stringhe', () => {
    const out = addSession([], { id: 'x', date: '2026-07-20', durationMin: '45', exercises: '6' })
    expect(out[0].durationMin).toBe(45)
    expect(out[0].exercises).toBe(6)
  })

  it('valori non numerici o negativi diventano 0', () => {
    const out = addSession([], { id: 'x', date: '2026-07-20', durationMin: 'abc', exercises: -3 })
    expect(out[0].durationMin).toBe(0)
    expect(out[0].exercises).toBe(0)
  })
})

describe('removeSession', () => {
  it('toglie solo la sessione con quell’id', () => {
    expect(removeSession([s('a', '2026-07-20'), s('b', '2026-07-20')], 'a').map(x => x.id)).toEqual(['b'])
  })
})

describe('sessionsOn / minutesOn', () => {
  const log = [s('a', '2026-07-20', 30), s('b', '2026-07-20', 45), s('c', '2026-07-19', 60)]

  it('filtra le sessioni di un giorno', () => {
    expect(sessionsOn(log, '2026-07-20').map(x => x.id)).toEqual(['a', 'b'])
  })

  it('somma i minuti dello stesso giorno', () => {
    expect(minutesOn(log, '2026-07-20')).toBe(75)
  })

  it('giorno senza allenamenti → 0 minuti', () => {
    expect(minutesOn(log, '2026-07-01')).toBe(0)
  })
})

describe('estimateKcal', () => {
  it('applica la formula MET: MET × 3.5 × kg / 200 × minuti', () => {
    // 5.0 × 3.5 × 80 / 200 × 60 = 420
    expect(estimateKcal(60, 80, STRENGTH_MET)).toBe(420)
  })

  it('senza peso restituisce null: non si inventa una stima', () => {
    expect(estimateKcal(60, 0)).toBeNull()
    expect(estimateKcal(60, null)).toBeNull()
  })

  it('durata nulla → null', () => {
    expect(estimateKcal(0, 80)).toBeNull()
  })
})

describe('burnedOn', () => {
  it('stima sulle sessioni del giorno', () => {
    // 30 + 30 = 60 min a 80 kg → 420
    expect(burnedOn([s('a', 'd', 30), s('b', 'd', 30)], 'd', 80)).toBe(420)
  })

  it('giorno senza allenamenti → null (nessun dato, non zero inventato)', () => {
    expect(burnedOn([], 'd', 80)).toBeNull()
  })
})

describe('activitySeries', () => {
  it('un punto per chiave, in ordine, anche per i giorni vuoti', () => {
    const out = activitySeries([s('a', 'd2', 40)], ['d1', 'd2'])
    expect(out).toEqual([
      { key: 'd1', minutes: 0, sessions: 0 },
      { key: 'd2', minutes: 40, sessions: 1 },
    ])
  })
})

describe('elapsedSec / formatElapsed', () => {
  it('conta i secondi trascorsi dall’inizio', () => {
    expect(elapsedSec(1000, 91_000)).toBe(90)
  })

  it('orologio spostato indietro → 0, mai negativo', () => {
    expect(elapsedSec(90_000, 1000)).toBe(0)
  })

  it('inizio mancante → 0', () => {
    expect(elapsedSec(null, 5000)).toBe(5) // epoch 0 + 5s
    expect(elapsedSec(undefined, 0)).toBe(0)
  })

  it('formatta in mm:ss con lo zero iniziale', () => {
    expect(formatElapsed(0)).toBe('00:00')
    expect(formatElapsed(90)).toBe('01:30')
    expect(formatElapsed(3725)).toBe('62:05')
  })
})

describe('workoutLogHasData', () => {
  it('true solo con almeno una sessione', () => {
    expect(workoutLogHasData([s('a', 'd')])).toBe(true)
    expect(workoutLogHasData([])).toBe(false)
    expect(workoutLogHasData(null)).toBe(false)
  })
})
