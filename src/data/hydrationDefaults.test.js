import { describe, it, expect } from 'vitest'
import { dayMl, addMl, hydrationPct, hydrationHasData, GLASS_ML } from './hydrationDefaults'

describe('dayMl', () => {
  it('legge i millilitri di un giorno', () => {
    expect(dayMl({ '2026-07-20': 750 }, '2026-07-20')).toBe(750)
  })

  it('un giorno mai registrato vale 0, non undefined', () => {
    expect(dayMl({}, '2026-07-20')).toBe(0)
    expect(dayMl(null, '2026-07-20')).toBe(0)
  })

  it('ignora valori corrotti o negativi', () => {
    expect(dayMl({ x: 'abc' }, 'x')).toBe(0)
    expect(dayMl({ x: -100 }, 'x')).toBe(0)
  })
})

describe('addMl', () => {
  it('somma senza mutare lo store originale', () => {
    const store = { '2026-07-20': 500 }
    const next = addMl(store, '2026-07-20', GLASS_ML)
    expect(next['2026-07-20']).toBe(750)
    expect(store['2026-07-20']).toBe(500) // input intatto
  })

  it('crea il giorno se non esiste', () => {
    expect(addMl({}, '2026-07-20', 250)).toEqual({ '2026-07-20': 250 })
  })

  it('sottrae con delta negativo', () => {
    expect(addMl({ d: 500 }, 'd', -250)).toEqual({ d: 250 })
  })

  it('non scende sotto zero e rimuove la chiave a zero', () => {
    expect(addMl({ d: 200 }, 'd', -999)).toEqual({})
    expect(addMl({ d: 250 }, 'd', -250)).toEqual({})
  })
})

describe('hydrationPct', () => {
  it('calcola la percentuale sull’obiettivo', () => {
    expect(hydrationPct(1000, 2000)).toBe(50)
  })

  it('taglia a 100 quando si supera l’obiettivo', () => {
    expect(hydrationPct(3000, 2000)).toBe(100)
  })

  it('obiettivo mancante o nullo → 0 (niente divisione per zero)', () => {
    expect(hydrationPct(500, 0)).toBe(0)
    expect(hydrationPct(500, null)).toBe(0)
  })
})

describe('hydrationHasData', () => {
  it('true solo con almeno un giorno con valore reale', () => {
    expect(hydrationHasData({ d: 250 })).toBe(true)
    expect(hydrationHasData({})).toBe(false)
    expect(hydrationHasData(null)).toBe(false)
  })
})
