import { describe, it, expect } from 'vitest'
import { dayKey, lastDayKeys, daysInMonth, clampDay, toISODate, fromISODate } from './date'

describe('dayKey', () => {
  it('formatta in YYYY-MM-DD con lo zero iniziale', () => {
    expect(dayKey(new Date(2026, 6, 5))).toBe('2026-07-05')
  })

  it('usa il fuso LOCALE, non UTC (niente slittamento a mezzanotte)', () => {
    expect(dayKey(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01')
    expect(dayKey(new Date(2026, 11, 31, 23, 30))).toBe('2026-12-31')
  })
})

describe('lastDayKeys', () => {
  it('restituisce n giorni fino a `end`, dal più vecchio al più recente', () => {
    expect(lastDayKeys(3, new Date(2026, 6, 21))).toEqual(['2026-07-19', '2026-07-20', '2026-07-21'])
  })

  it('attraversa il cambio di mese', () => {
    expect(lastDayKeys(2, new Date(2026, 6, 1))).toEqual(['2026-06-30', '2026-07-01'])
  })
})

describe('daysInMonth', () => {
  it('conosce i mesi corti', () => {
    expect(daysInMonth(2026, 1)).toBe(31)
    expect(daysInMonth(2026, 4)).toBe(30)
    expect(daysInMonth(2026, 12)).toBe(31)
  })

  it('gestisce febbraio e gli anni bisestili', () => {
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2000, 2)).toBe(29) // divisibile per 400: bisestile
    expect(daysInMonth(1900, 2)).toBe(28) // divisibile per 100 ma non 400: NON bisestile
  })
})

describe('clampDay', () => {
  it('riporta il giorno dentro il mese', () => {
    expect(clampDay(2026, 2, 31)).toBe(28)
    expect(clampDay(2024, 2, 31)).toBe(29)
    expect(clampDay(2026, 4, 31)).toBe(30)
  })

  it('non scende sotto 1', () => {
    expect(clampDay(2026, 5, 0)).toBe(1)
    expect(clampDay(2026, 5, -3)).toBe(1)
  })

  it('lascia stare i giorni validi', () => {
    expect(clampDay(2026, 7, 15)).toBe(15)
  })
})

describe('toISODate', () => {
  it('formatta con gli zeri iniziali', () => {
    expect(toISODate(2026, 7, 5)).toBe('2026-07-05')
  })

  it('taglia il giorno se eccede il mese', () => {
    expect(toISODate(2026, 2, 31)).toBe('2026-02-28')
  })
})

describe('fromISODate', () => {
  it('legge una data valida', () => {
    expect(fromISODate('1990-03-14')).toEqual({ year: 1990, month: 3, day: 14 })
  })

  it('rifiuta formati e valori impossibili', () => {
    expect(fromISODate('')).toBeNull()
    expect(fromISODate(null)).toBeNull()
    expect(fromISODate('14/03/1990')).toBeNull()
    expect(fromISODate('1990-13-01')).toBeNull()
    expect(fromISODate('2026-02-30')).toBeNull()
  })
})
