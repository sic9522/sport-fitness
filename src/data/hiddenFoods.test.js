import { describe, it, expect } from 'vitest'
import { addHiddenFoods, filterHidden } from './hiddenFoods'

describe('addHiddenFoods', () => {
  it('unisce senza doppioni: nascondere due volte è un no-op', () => {
    expect(addHiddenFoods(['a'], ['a', 'b'])).toEqual(['a', 'b'])
  })

  it('regge liste assenti da entrambe le parti', () => {
    expect(addHiddenFoods(null, ['a'])).toEqual(['a'])
    expect(addHiddenFoods(['a'], null)).toEqual(['a'])
    expect(addHiddenFoods(null, null)).toEqual([])
  })
})

describe('filterHidden', () => {
  const list = [{ id: 'a', name: 'Mela' }, { id: 'b', name: 'Pera' }]

  it('toglie quello che l’utente ha nascosto', () => {
    expect(filterHidden(list, new Set(['a'])).map(f => f.id)).toEqual(['b'])
  })

  it('senza nascosti restituisce la lista invariata', () => {
    expect(filterHidden(list, new Set())).toBe(list)
    expect(filterHidden(list, null)).toBe(list)
  })

  it('lista assente → array vuoto, non un errore', () => {
    expect(filterHidden(null, new Set(['a']))).toEqual([])
  })
})
