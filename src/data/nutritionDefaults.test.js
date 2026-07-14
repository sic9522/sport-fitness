import { describe, it, expect } from 'vitest'
import {
  sumNutrients, dayTotals, dateKey, diarioHasData, dayMeals,
  weekDateKeys, monthDateKeys, monthWeeks, rangeTotals, dailyKcalSeries, startOfWeek, weekOfMonth, clippedWeek,
} from './nutritionDefaults'

describe('sumNutrients', () => {
  it('somma i 5 macro + kcal (stringhe o numeri)', () => {
    const foods = [
      { kcal: '100', protein: '10', carbs: '20', fat: '5', sugars: '8', fiber: '2' },
      { kcal: 50, protein: 5, carbs: 10, fat: 2, sugars: 4, fiber: 1 },
    ]
    expect(sumNutrients(foods)).toEqual({
      kcal: 150, protein: 15, carbs: 30, fat: 7, sugars: 12, fiber: 3,
    })
  })
  it('tratta i valori vuoti/non numerici/assenti come 0', () => {
    expect(sumNutrients([{ kcal: '', protein: 'x' }])).toEqual({
      kcal: 0, protein: 0, carbs: 0, fat: 0, sugars: 0, fiber: 0,
    })
  })
})

describe('weekOfMonth', () => {
  it('numera le settimane lun→dom dentro il mese', () => {
    expect(weekOfMonth(new Date(2026, 6, 13))).toBe(3) // 13 lug 2026 (lunedì) → settimana 3
    expect(weekOfMonth(new Date(2026, 6, 1))).toBe(1)  // 1 lug → settimana 1
  })
})

describe('dayTotals', () => {
  it('accorpa i 4 pasti', () => {
    const meals = {
      breakfast: [{ kcal: '100' }],
      lunch: [{ kcal: '200' }],
      dinner: [{ kcal: '300' }],
      snacks: [{ kcal: '50' }],
    }
    expect(dayTotals(meals).kcal).toBe(650)
  })
})

describe('dateKey', () => {
  it('formatta YYYY-MM-DD in fuso locale con zero-padding', () => {
    // Costruita da componenti locali → deterministica a prescindere dal TZ.
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(dateKey(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

describe('diarioHasData', () => {
  it('false su diario vuoto o giorni con liste vuote', () => {
    expect(diarioHasData({})).toBe(false)
    expect(diarioHasData(null)).toBe(false)
    expect(diarioHasData({ '2026-01-01': { breakfast: [], lunch: [], dinner: [], snacks: [] } })).toBe(false)
  })
  it('true se almeno un pasto ha un alimento', () => {
    expect(diarioHasData({ '2026-01-01': { snacks: [{ id: '1' }] } })).toBe(true)
  })
})

describe('dayMeals', () => {
  it('ritorna sempre le 4 liste anche per un giorno assente', () => {
    expect(dayMeals({}, '2026-01-01')).toEqual({ breakfast: [], lunch: [], dinner: [], snacks: [] })
  })
  it('unisce le liste esistenti mantenendo le mancanti vuote', () => {
    const diario = { '2026-01-01': { lunch: [{ id: 'a' }] } }
    const meals = dayMeals(diario, '2026-01-01')
    expect(meals.lunch).toHaveLength(1)
    expect(meals.breakfast).toEqual([])
  })
})

describe('startOfWeek / weekDateKeys', () => {
  it('startOfWeek è sempre un lunedì', () => {
    expect(startOfWeek(new Date(2026, 0, 7)).getDay()).toBe(1)
    expect(startOfWeek(new Date(2026, 0, 4)).getDay()).toBe(1) // una domenica → lunedì precedente
  })
  it('weekDateKeys: 7 giorni consecutivi (settimana interna al mese)', () => {
    const keys = weekDateKeys(new Date(2026, 0, 7))
    expect(keys).toHaveLength(7)
    for (let i = 1; i < 7; i++) {
      expect((new Date(keys[i]) - new Date(keys[i - 1])) / 86400000).toBe(1)
    }
  })
  it('weekDateKeys: ritagliata a fine mese', () => {
    expect(weekDateKeys(new Date(2026, 0, 31))).toEqual([
      '2026-01-26', '2026-01-27', '2026-01-28', '2026-01-29', '2026-01-30', '2026-01-31',
    ])
  })
})

describe('monthWeeks', () => {
  it('divide il mese in settimane clippate contigue che coprono tutti i giorni', () => {
    const weeks = monthWeeks(new Date(2026, 6, 15)) // luglio 2026 → 5 settimane
    expect(weeks[0].start.getDate()).toBe(1)
    expect(weeks[weeks.length - 1].end.getDate()).toBe(31)
    for (let i = 1; i < weeks.length; i++) {
      expect((weeks[i].start - weeks[i - 1].end) / 86400000).toBe(1) // contigue
    }
  })
})

describe('clippedWeek', () => {
  it('non sconfina: fine clampata a fine mese', () => {
    const w = clippedWeek(new Date(2026, 0, 31)) // sab 31 gen → settimana 26–31
    expect(w.start.getDate()).toBe(26)
    expect(w.end.getDate()).toBe(31)
    expect(w.end.getMonth()).toBe(0)
  })
  it('inizio clampato al giorno 1 del mese', () => {
    const w = clippedWeek(new Date(2026, 1, 1)) // dom 1 feb → settimana 1–1
    expect(w.start.getDate()).toBe(1)
    expect(w.end.getDate()).toBe(1)
    expect(w.start.getMonth()).toBe(1)
  })
})

describe('monthDateKeys', () => {
  it('copre tutti i giorni del mese', () => {
    const jan = monthDateKeys(new Date(2026, 0, 10))
    expect(jan).toHaveLength(31)
    expect(jan[0]).toBe('2026-01-01')
    expect(jan[30]).toBe('2026-01-31')
    expect(monthDateKeys(new Date(2026, 1, 15))).toHaveLength(28) // febbraio 2026
  })
})

describe('rangeTotals / dailyKcalSeries', () => {
  const diario = {
    '2026-01-01': { breakfast: [{ kcal: '100', protein: '5' }], lunch: [], dinner: [], snacks: [] },
    '2026-01-02': { breakfast: [], lunch: [{ kcal: '200' }], dinner: [], snacks: [] },
  }
  const keys = ['2026-01-01', '2026-01-02', '2026-01-03']
  it('rangeTotals somma i giorni indicati', () => {
    const tot = rangeTotals(diario, keys)
    expect(tot.kcal).toBe(300)
    expect(tot.protein).toBe(5)
  })
  it('dailyKcalSeries: kcal per ciascuna chiave (0 se assente)', () => {
    expect(dailyKcalSeries(diario, keys)).toEqual([100, 200, 0])
  })
})
