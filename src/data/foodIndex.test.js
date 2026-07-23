import { describe, it, expect } from 'vitest'
import { foodInitial, groupByInitial, OTHER_INITIAL } from './foodIndex'

describe('foodInitial', () => {
  it('usa la lettera maiuscola, qualunque sia il caso di partenza', () => {
    expect(foodInitial('mozzarella')).toBe('M')
    expect(foodInitial('Parmigiano')).toBe('P')
  })

  it('riconduce le accentate alla lettera base', () => {
    expect(foodInitial('Èspresso')).toBe('E')
    expect(foodInitial('à la tartar')).toBe('A')
  })

  it('manda sotto # cifre, simboli e alfabeti non latini', () => {
    expect(foodInitial('100% Succo')).toBe(OTHER_INITIAL)
    expect(foodInitial('- Sammontana')).toBe(OTHER_INITIAL)
    expect(foodInitial(', grandi firme')).toBe(OTHER_INITIAL)
    expect(foodInitial('日本茶')).toBe(OTHER_INITIAL)
  })

  it('ignora gli spazi iniziali e regge nome vuoto o assente', () => {
    expect(foodInitial('  yogurt')).toBe('Y')
    expect(foodInitial('')).toBe(OTHER_INITIAL)
    expect(foodInitial(null)).toBe(OTHER_INITIAL)
  })
})

describe('groupByInitial', () => {
  const items = [
    { id: 1, name: 'Ananas' },
    { id: 2, name: 'Avocado' },
    { id: 3, name: 'Banana' },
    { id: 4, name: '100% Succo' },
  ]

  it('raggruppa gli elementi consecutivi con la stessa iniziale', () => {
    expect(groupByInitial(items).map(g => [g.initial, g.items.length])).toEqual([
      ['A', 2], ['B', 1], [OTHER_INITIAL, 1],
    ])
  })

  it('non riordina: rispetta la sequenza ricevuta dal database', () => {
    const groups = groupByInitial([{ id: 1, name: 'Zucchero' }, { id: 2, name: 'Ananas' }])
    expect(groups.map(g => g.initial)).toEqual(['Z', 'A'])
  })

  it('apre un nuovo gruppo se la stessa iniziale ricompare più tardi', () => {
    const groups = groupByInitial([{ id: 1, name: 'Ananas' }, { id: 2, name: 'Banana' }, { id: 3, name: 'Avocado' }])
    expect(groups.map(g => g.initial)).toEqual(['A', 'B', 'A'])
  })

  it('lista vuota → nessun gruppo', () => {
    expect(groupByInitial([])).toEqual([])
  })
})
