import { describe, it, expect } from 'vitest'
import {
  sumNutrients, dayTotals, dateKey, diarioHasData, dayMeals,
  weekDateKeys, monthDateKeys, rangeTotals, dailyKcalSeries, startOfWeek,
} from './nutritionDefaults'

describe('sumNutrients', () => {
  it('somma i 6 macro + kcal (stringhe o numeri)', () => {
    const foods = [
      { kcal: '100', protein: '10', carbs: '20', satFat: '5', unsatFat: '3', sugars: '8', fiber: '2' },
      { kcal: 50, protein: 5, carbs: 10, satFat: 2, unsatFat: 1, sugars: 4, fiber: 1 },
    ]
    expect(sumNutrients(foods)).toEqual({
      kcal: 150, protein: 15, carbs: 30, satFat: 7, unsatFat: 4, sugars: 12, fiber: 3,
    })
  })
  it('tratta i valori vuoti/non numerici/assenti come 0', () => {
    expect(sumNutrients([{ kcal: '', protein: 'x' }])).toEqual({
      kcal: 0, protein: 0, carbs: 0, satFat: 0, unsatFat: 0, sugars: 0, fiber: 0,
    })
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
  it('weekDateKeys: 7 giorni consecutivi', () => {
    const keys = weekDateKeys(new Date(2026, 0, 7))
    expect(keys).toHaveLength(7)
    for (let i = 1; i < 7; i++) {
      expect((new Date(keys[i]) - new Date(keys[i - 1])) / 86400000).toBe(1)
    }
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
