import { describe, it, expect } from 'vitest'
import { capitalizeFirst, numericOnly, weeksInMonth, scaleGoal, goalsForPeriod } from './goalDefaults'

describe('capitalizeFirst', () => {
  it('rende maiuscola la prima lettera', () => {
    expect(capitalizeFirst('corsa mattutina')).toBe('Corsa mattutina')
  })

  it('non tocca il resto del testo (sigle e nomi propri restano)', () => {
    expect(capitalizeFirst('hiit in palestra')).toBe('Hiit in palestra')
    expect(capitalizeFirst('kcal MAX')).toBe('Kcal MAX')
  })

  it('ignora gli spazi iniziali', () => {
    expect(capitalizeFirst('   nuoto')).toBe('Nuoto')
  })

  it('gestisce vuoto e valori assenti', () => {
    expect(capitalizeFirst('')).toBe('')
    expect(capitalizeFirst('   ')).toBe('')
    expect(capitalizeFirst(null)).toBe('')
  })
})

describe('numericOnly', () => {
  it('toglie lettere e simboli', () => {
    expect(numericOnly('12a3')).toBe('123')
    expect(numericOnly('60 min')).toBe('60')
    expect(numericOnly('-45')).toBe('45')
  })

  it('accetta i decimali e normalizza la virgola', () => {
    expect(numericOnly('2,5')).toBe('2.5')
    expect(numericOnly('2.5')).toBe('2.5')
  })

  it('ammette UN solo separatore decimale', () => {
    expect(numericOnly('2.5.3')).toBe('2.53')
  })

  it('stringa vuota resta vuota (si deve poter cancellare il campo)', () => {
    expect(numericOnly('')).toBe('')
    expect(numericOnly('abc')).toBe('')
  })
})

describe('weeksInMonth', () => {
  it('conta le settimane come righe di calendario', () => {
    // luglio 2026: 31 giorni, inizia di mercoledì → 5 righe
    expect(weeksInMonth(2026, 7)).toBe(5)
    // febbraio 2027: 28 giorni, inizia di lunedì → esattamente 4
    expect(weeksInMonth(2027, 2)).toBe(4)
  })

  it('non restituisce mai meno di 4', () => {
    for (let m = 1; m <= 12; m += 1) expect(weeksInMonth(2026, m)).toBeGreaterThanOrEqual(4)
  })
})

describe('scaleGoal', () => {
  const daily = { target: 2.5, perWorkout: false }      // 2,5 l al giorno
  const perWorkout = { target: 60, perWorkout: true }   // 60 min per allenamento

  it('il giornaliero resta invariato', () => {
    expect(scaleGoal(daily, 'daily')).toBe(2.5)
    expect(scaleGoal(perWorkout, 'daily')).toBe(60)
  })

  it('un obiettivo di ogni giorno si moltiplica per 7', () => {
    expect(scaleGoal(daily, 'weekly')).toBe(17.5)
  })

  it('un obiettivo PER ALLENAMENTO segue il numero di allenamenti, non i giorni', () => {
    expect(scaleGoal(perWorkout, 'weekly', { workoutsPerWeek: 3 })).toBe(180)
    expect(scaleGoal(perWorkout, 'weekly', { workoutsPerWeek: 5 })).toBe(300)
  })

  it('il mensile moltiplica il settimanale per le settimane del mese', () => {
    expect(scaleGoal(perWorkout, 'monthly', { workoutsPerWeek: 3, weeks: 5 })).toBe(900)
    expect(scaleGoal(daily, 'monthly', { weeks: 4 })).toBe(70)
  })

  it('senza allenamenti previsti il settimanale per-allenamento e zero, non i giorni', () => {
    expect(scaleGoal(perWorkout, 'weekly', { workoutsPerWeek: 0 })).toBe(0)
  })

  it('arrotonda a un decimale invece di propagare code binarie', () => {
    expect(scaleGoal({ target: 0.1, perWorkout: false }, 'weekly')).toBe(0.7)
  })

  it('obiettivi non validi valgono 0 e non NaN', () => {
    expect(scaleGoal({ target: 'abc' }, 'weekly')).toBe(0)
    expect(scaleGoal(null, 'weekly')).toBe(0)
  })
})

describe('goalsForPeriod', () => {
  it('scala tutti gli obiettivi mantenendo gli altri campi', () => {
    const goals = [{ id: 'a', emoji: '💪', title: 'Cardio', target: 60, unit: 'min', perWorkout: true }]
    const out = goalsForPeriod(goals, 'weekly', { workoutsPerWeek: 4 })
    expect(out[0]).toMatchObject({ id: 'a', emoji: '💪', title: 'Cardio', unit: 'min', target: 240 })
  })

  it('lista assente o non valida non esplode', () => {
    expect(goalsForPeriod(null, 'weekly')).toEqual([])
  })
})
