import { describe, it, expect } from 'vitest'
import { sortFoods, sortFieldByKey, SORT_FIELDS } from './foodSort'

const foods = [
  { name: 'Pasta', calories_kcal: 355, fiber_g: 3 },
  { name: 'Mela', calories_kcal: 52, fiber_g: 2.4 },
  { name: 'Burro', calories_kcal: 750, fiber_g: null },
]

describe('SORT_FIELDS / sortFieldByKey', () => {
  it('offre nome, kcal e i cinque macro', () => {
    expect(SORT_FIELDS.map(f => f.key)).toEqual(['name', 'kcal', 'protein', 'carbs', 'fat', 'sugars', 'fiber'])
  })

  it('chiave sconosciuta → il primo criterio (nome), non undefined', () => {
    expect(sortFieldByKey('boh').col).toBe('name')
    expect(sortFieldByKey('kcal').col).toBe('calories_kcal')
  })
})

describe('sortFoods', () => {
  it('ordina per numero, crescente e decrescente', () => {
    expect(sortFoods(foods, 'calories_kcal', true).map(f => f.name)).toEqual(['Mela', 'Pasta', 'Burro'])
    expect(sortFoods(foods, 'calories_kcal', false).map(f => f.name)).toEqual(['Burro', 'Pasta', 'Mela'])
  })

  it('ordina per nome ignorando le maiuscole', () => {
    const list = [{ name: 'banana' }, { name: 'Ananas' }]
    expect(sortFoods(list, 'name', true).map(f => f.name)).toEqual(['Ananas', 'banana'])
  })

  it('i valori mancanti stanno in fondo IN ENTRAMBI i versi', () => {
    expect(sortFoods(foods, 'fiber_g', true).map(f => f.name)).toEqual(['Mela', 'Pasta', 'Burro'])
    expect(sortFoods(foods, 'fiber_g', false).map(f => f.name)).toEqual(['Pasta', 'Mela', 'Burro'])
  })

  it('a parità di valore decide il nome: l’ordine non balla tra un render e l’altro', () => {
    const pari = [{ name: 'Zucca', calories_kcal: 25 }, { name: 'Anice', calories_kcal: 25 }]
    expect(sortFoods(pari, 'calories_kcal', true).map(f => f.name)).toEqual(['Anice', 'Zucca'])
  })

  it('non modifica la lista ricevuta', () => {
    const original = [...foods]
    sortFoods(foods, 'calories_kcal', false)
    expect(foods).toEqual(original)
  })

  it('lista vuota o assente non esplode', () => {
    expect(sortFoods([], 'name', true)).toEqual([])
    expect(sortFoods(null, 'name', true)).toEqual([])
  })
})
