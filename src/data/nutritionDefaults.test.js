import { describe, it, expect } from 'vitest'
import { sumNutrients, dayTotals, dateKey, diarioHasData, dayMeals } from './nutritionDefaults'

describe('sumNutrients', () => {
  it('somma valori come stringhe o numeri', () => {
    const foods = [
      { kcal: '100', protein: '10', carbs: '20', fat: '5' },
      { kcal: 50, protein: 5, carbs: 10, fat: 2 },
    ]
    expect(sumNutrients(foods)).toEqual({ kcal: 150, protein: 15, carbs: 30, fat: 7 })
  })
  it('tratta i valori vuoti/non numerici come 0', () => {
    expect(sumNutrients([{ kcal: '', protein: 'x' }])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
  })
  it('lista vuota → tutti 0', () => {
    expect(sumNutrients([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
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
