import { describe, it, expect } from 'vitest'
import {
  totalReps, estimatedSeconds, formatDuration, schedaRest, exerciseTotal, schedaSummary,
  formatClock, formatDayMonth, completionRatio, COMPLETION_THRESHOLD,
  SECONDS_PER_REP, DEFAULT_REST_SECONDS,
} from './schedaStats'

const exNoSplit = { id: 'a', titolo: 'Panca', serie: '3', reps: '10', kg: '80' }
const exSplit = {
  id: 'b', titolo: 'Squat', serie: '3', split: true, reps: '12', kg: '60',
  sets: [{ reps: '12', kg: '60' }, { reps: '10', kg: '70' }, { reps: '8', kg: '80' }],
}

describe('totalReps', () => {
  it('somma le ripetizioni di ogni serie', () => {
    expect(totalReps({ esercizi: [exNoSplit] })).toBe(30) // 3 serie x 10
  })

  it('con split ogni serie porta le SUE ripetizioni', () => {
    expect(totalReps({ esercizi: [exSplit] })).toBe(30) // 12 + 10 + 8
  })

  it('somma su piu esercizi', () => {
    expect(totalReps({ esercizi: [exNoSplit, exSplit] })).toBe(60)
  })

  it('scheda vuota o assente non esplode', () => {
    expect(totalReps(null)).toBe(0)
    expect(totalReps({ esercizi: [] })).toBe(0)
  })

  it('ripetizioni non compilate valgono zero', () => {
    expect(totalReps({ esercizi: [{ id: 'x', serie: '3', reps: '', kg: '' }] })).toBe(0)
  })
})

describe('estimatedSeconds', () => {
  it('applica la formula dell esempio: 3 serie x 10 rip, recupero 90s', () => {
    // (10 x 3,5 = 35) + 90 = 125 al giro, x3 = 375
    const scheda = { rest: 90, esercizi: [exNoSplit] }
    expect(estimatedSeconds(scheda)).toBe(375)
  })

  it('il recupero e incluso anche dopo l ultima serie, come da formula', () => {
    const oneSet = { rest: 90, esercizi: [{ id: 'x', serie: '1', reps: '10', kg: '20' }] }
    expect(estimatedSeconds(oneSet)).toBe(10 * SECONDS_PER_REP + 90)
  })

  it('con split usa le ripetizioni di ciascuna serie', () => {
    const scheda = { rest: 60, esercizi: [exSplit] }
    // (12+10+8) x 3,5 = 105, piu 3 recuperi da 60 = 180 -> 285
    expect(estimatedSeconds(scheda)).toBe(285)
  })

  it('senza recupero impostato usa il valore predefinito', () => {
    const scheda = { esercizi: [{ id: 'x', serie: '2', reps: '10', kg: '20' }] }
    expect(estimatedSeconds(scheda)).toBe(2 * (10 * SECONDS_PER_REP + DEFAULT_REST_SECONDS))
  })

  it('scheda vuota vale zero', () => {
    expect(estimatedSeconds({ esercizi: [] })).toBe(0)
    expect(estimatedSeconds(null)).toBe(0)
  })
})

describe('schedaRest', () => {
  it('usa il recupero della scheda quando c e', () => {
    expect(schedaRest({ rest: 90 })).toBe(90)
  })

  it('ripiega sul predefinito se assente, zero o non valido', () => {
    expect(schedaRest({})).toBe(DEFAULT_REST_SECONDS)
    expect(schedaRest({ rest: 0 })).toBe(DEFAULT_REST_SECONDS)
    expect(schedaRest({ rest: 'abc' })).toBe(DEFAULT_REST_SECONDS)
  })
})

describe('formatDuration', () => {
  it('sotto l ora mostra i soli minuti', () => {
    expect(formatDuration(480)).toBe('8 min')
    expect(formatDuration(840)).toBe('14 min')
  })

  it('arrotonda al minuto: una stima non ha bisogno dei secondi', () => {
    expect(formatDuration(375)).toBe('6 min')  // 6,25
    expect(formatDuration(390)).toBe('7 min')  // 6,5 -> 7
  })

  it('sopra l ora usa ore e minuti a due cifre', () => {
    expect(formatDuration(4080)).toBe('1 h 08 min')
    expect(formatDuration(3600)).toBe('1 h 00 min')
    expect(formatDuration(7500)).toBe('2 h 05 min')
  })

  it('valori nulli o assurdi danno 0 min, non NaN', () => {
    expect(formatDuration(0)).toBe('0 min')
    expect(formatDuration(null)).toBe('0 min')
    expect(formatDuration('x')).toBe('0 min')
  })
})

describe('exerciseTotal e schedaSummary', () => {
  it('conta gli esercizi dell elenco', () => {
    expect(exerciseTotal({ esercizi: [exNoSplit, exSplit] })).toBe(2)
    expect(exerciseTotal(null)).toBe(0)
  })

  it('schedaSummary raccoglie i dati del piano in una chiamata', () => {
    const s = schedaSummary({ rest: 90, esercizi: [exNoSplit] })
    expect(s).toEqual({ exercises: 1, reps: 30, seconds: 375 })
  })
})

describe('formatClock', () => {
  it('formatta HH:MM con due cifre', () => {
    expect(formatClock(24 * 60)).toBe('00:24')
    expect(formatClock(3600)).toBe('01:00')
    expect(formatClock(4500)).toBe('01:15')
  })

  it('valori nulli danno 00:00', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(null)).toBe('00:00')
  })
})

describe('formatDayMonth', () => {
  it('formatta GG/MM con due cifre', () => {
    expect(formatDayMonth(new Date(2026, 6, 21, 12).getTime())).toBe('21/07')
    expect(formatDayMonth(new Date(2026, 0, 5, 12).getTime())).toBe('05/01')
  })

  it('senza data restituisce null: la card mostra un trattino, non 01/01', () => {
    expect(formatDayMonth(null)).toBeNull()
    expect(formatDayMonth(0)).toBeNull()
    expect(formatDayMonth('x')).toBeNull()
  })
})

describe('completionRatio e soglia badge', () => {
  it('frazione fra 0 e 1', () => {
    expect(completionRatio(6, 8)).toBe(0.75)
    expect(completionRatio(0, 8)).toBe(0)
    expect(completionRatio(8, 8)).toBe(1)
  })

  it('totale a zero non divide per zero', () => {
    expect(completionRatio(3, 0)).toBe(0)
    expect(completionRatio(null, null)).toBe(0)
  })

  it('non supera mai 1, anche se la scheda e stata accorciata dopo', () => {
    expect(completionRatio(10, 8)).toBe(1)
  })

  it('la soglia del badge e al 70%', () => {
    expect(COMPLETION_THRESHOLD).toBe(0.7)
    expect(completionRatio(6, 8) >= COMPLETION_THRESHOLD).toBe(true)  // 75% verde
    expect(completionRatio(5, 8) >= COMPLETION_THRESHOLD).toBe(false) // 62,5% rosso
    expect(completionRatio(7, 10) >= COMPLETION_THRESHOLD).toBe(true) // 70% esatto: verde
  })
})
