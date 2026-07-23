import { describe, it, expect } from 'vitest'
import { upsertCustomMeal, findCustomMeal } from './customMeals'

describe('upsertCustomMeal', () => {
  const a = { id: '1', nome: 'Colazione tipo' }
  const b = { id: '2', nome: 'Abbuffata' }

  it('aggiunge il nuovo pasto e riordina per nome', () => {
    expect(upsertCustomMeal([a], b).map(m => m.nome)).toEqual(['Abbuffata', 'Colazione tipo'])
  })

  it('sostituisce quello con lo stesso id invece di duplicarlo', () => {
    const next = upsertCustomMeal([a, b], { id: '1', nome: 'Colazione leggera' })
    expect(next).toHaveLength(2)
    expect(next.map(m => m.nome)).toEqual(['Abbuffata', 'Colazione leggera'])
  })

  it('regge una lista assente', () => {
    expect(upsertCustomMeal(null, a)).toEqual([a])
  })
})

describe('findCustomMeal', () => {
  const list = [{ id: '1', nome: 'Colazione tipo' }]

  it('trova per id', () => {
    expect(findCustomMeal(list, '1').nome).toBe('Colazione tipo')
  })

  it('null se l’id non c’è, se la lista manca o se l’id è vuoto (voce "Nessuno")', () => {
    expect(findCustomMeal(list, '9')).toBeNull()
    expect(findCustomMeal(null, '1')).toBeNull()
    expect(findCustomMeal(list, '')).toBeNull()
  })
})
