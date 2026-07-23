import { describe, it, expect } from 'vitest'
import {
  upsertCustomFood, removeCustomFood, searchCustomFoods, mergeCustomFoods, isCustomFood,
  compositeNutrients, isCompositeFood, foodDisplayName,
  addVariant, removeVariant, hasVariants, flattenCustomFoods, isNameTaken,
} from './customFoods'

const mine = { id: '1', source: 'custom', name: 'Bistecca Simone', calories_kcal: 150 }
const other = { id: '2', source: 'custom', name: 'Ananas del contadino', calories_kcal: 50 }

describe('upsertCustomFood / removeCustomFood', () => {
  it('aggiunge e riordina per nome', () => {
    expect(upsertCustomFood([mine], other).map(f => f.name))
      .toEqual(['Ananas del contadino', 'Bistecca Simone'])
  })

  it('sostituisce per id invece di duplicare', () => {
    const next = upsertCustomFood([mine], { ...mine, calories_kcal: 200 })
    expect(next).toHaveLength(1)
    expect(next[0].calories_kcal).toBe(200)
  })

  it('rimuove per id e regge la lista assente', () => {
    expect(removeCustomFood([mine, other], '1').map(f => f.id)).toEqual(['2'])
    expect(removeCustomFood(null, '1')).toEqual([])
  })
})

describe('searchCustomFoods', () => {
  const list = [mine, other, { id: '3', source: 'custom', name: 'Pane di Bistecca' }]

  it('trova per sottostringa senza distinguere maiuscole', () => {
    expect(searchCustomFoods(list, 'BISTEC').map(f => f.id)).toEqual(['1', '3'])
  })

  it('mette davanti i nomi che iniziano col testo', () => {
    expect(searchCustomFoods(list, 'bistecca')[0].name).toBe('Bistecca Simone')
  })

  it('sotto i 2 caratteri non cerca (come la ricerca sul catalogo)', () => {
    expect(searchCustomFoods(list, 'b')).toEqual([])
    expect(searchCustomFoods(list, '')).toEqual([])
  })
})

describe('mergeCustomFoods', () => {
  const remote = [{ id: 'r1', name: 'Bistecca' }, { id: 'r2', name: 'Bistecca di manzo' }]

  it('mette i propri alimenti SUBITO DOPO il primo risultato del catalogo', () => {
    expect(mergeCustomFoods(remote, [mine]).map(f => f.name))
      .toEqual(['Bistecca', 'Bistecca Simone', 'Bistecca di manzo'])
  })

  it('senza alimenti propri lascia i risultati come sono', () => {
    expect(mergeCustomFoods(remote, [])).toBe(remote)
    expect(mergeCustomFoods(remote, null)).toBe(remote)
  })

  it('senza risultati dal catalogo restano i propri', () => {
    expect(mergeCustomFoods([], [mine])).toEqual([mine])
    expect(mergeCustomFoods(null, [mine])).toEqual([mine])
  })
})

describe('isCustomFood', () => {
  it('distingue i propri alimenti da catalogo e generici', () => {
    expect(isCustomFood(mine)).toBe(true)
    expect(isCustomFood({ source: 'generic' })).toBe(false)
    expect(isCustomFood({ source: 'off' })).toBe(false)
    expect(isCustomFood(null)).toBe(false)
  })
})

describe('compositeNutrients (alimenti composti)', () => {
  // Pasta 355 kcal/100 g, guanciale 655: una carbonara con 200 g di pasta.
  const pasta = { calories_kcal: 355, protein_g: 12, carbs_g: 72, fat_g: 1.5, grams: '200' }
  const guanciale = { calories_kcal: 655, protein_g: 15, carbs_g: 0, fat_g: 65, grams: '50' }

  it('il totale somma i contributi effettivi (valore/100 g × grammi)', () => {
    // 355×2 + 655×0,5 = 710 + 327,5
    expect(compositeNutrients([pasta, guanciale]).totals.calories_kcal).toBe(1038)
  })

  it('il "per 100 g" è riferito ai grammi del PRIMO alimento, non al peso totale', () => {
    // 1037,5 kcal per 200 g di pasta → 100 g di pasta ne valgono 518,75
    const r = compositeNutrients([pasta, guanciale])
    expect(r.mainGrams).toBe(200)
    expect(r.per100.calories_kcal).toBe(519)
  })

  it('il caso raccontato da Simone: 800 kcal con 200 g di principale → 400 per 100 g', () => {
    const r = compositeNutrients([{ calories_kcal: 400, grams: '200' }])
    expect(r.totals.calories_kcal).toBe(800)
    expect(r.per100.calories_kcal).toBe(400)
  })

  it('senza grammi un ingrediente non conta: non si sa quanto se ne è usato', () => {
    const r = compositeNutrients([pasta, { calories_kcal: 655, grams: '' }])
    expect(r.totals.calories_kcal).toBe(710)
  })

  it('senza grammi sul principale il per 100 g non è calcolabile', () => {
    const r = compositeNutrients([{ calories_kcal: 355, grams: '' }, guanciale])
    expect(r.mainGrams).toBeNull()
    expect(r.per100.calories_kcal).toBeNull()
    expect(r.totals.calories_kcal).toBe(328) // il totale però si sa
  })

  it('un nutriente che non dichiara nessuno resta null, non 0', () => {
    expect(compositeNutrients([pasta, guanciale]).totals.fiber_g).toBeNull()
  })

  it('kcal intere, macro a un decimale', () => {
    const r = compositeNutrients([{ calories_kcal: 100.4, protein_g: 1.23, grams: '100' }])
    expect(r.totals.calories_kcal).toBe(100)
    expect(r.totals.protein_g).toBe(1.2)
  })

  it('grammi non validi o negativi = ingrediente ignorato', () => {
    expect(compositeNutrients([{ calories_kcal: 100, grams: '-50' }]).totals.calories_kcal).toBeNull()
    expect(compositeNutrients([{ calories_kcal: 100, grams: 'abc' }]).mainGrams).toBeNull()
  })

  it('lista vuota o sporca → tutto null', () => {
    expect(compositeNutrients([]).totals.calories_kcal).toBeNull()
    expect(compositeNutrients([null, undefined]).per100.protein_g).toBeNull()
  })
})

describe('isCompositeFood / foodDisplayName', () => {
  const composite = { name: 'Carbonara Di Simone', components: [{ name: 'Pasta', grams: '200' }] }

  it('l’asterisco marca i composti, perché i loro valori sono una stima', () => {
    expect(foodDisplayName(composite)).toBe('Carbonara Di Simone *')
  })

  it('gli alimenti semplici e quelli di catalogo restano com’erano', () => {
    expect(foodDisplayName(mine)).toBe('Bistecca Simone')
    expect(foodDisplayName({ name: 'Bistecca di manzo' })).toBe('Bistecca di manzo')
    expect(foodDisplayName(null)).toBe('')
  })

  it('components vuoto non fa un composto', () => {
    expect(isCompositeFood({ name: 'x', components: [] })).toBe(false)
    expect(isCompositeFood(composite)).toBe(true)
  })
})

describe('varianti', () => {
  const parent = { id: 'p', name: 'Carbonara', components: [{ name: 'Pasta' }] }
  const v1 = { id: 'v1', name: 'Carbonara leggera', components: [{ name: 'Pasta' }] }

  it('addVariant la mette dentro il suo originale, non nell’elenco', () => {
    const next = addVariant([parent], 'p', v1)
    expect(next).toHaveLength(1)
    expect(next[0].variants.map(v => v.id)).toEqual(['v1'])
  })

  it('rimettere la stessa variante la sostituisce (modifica, non doppione)', () => {
    const once = addVariant([parent], 'p', v1)
    const twice = addVariant(once, 'p', { ...v1, name: 'Carbonara light' })
    expect(twice[0].variants).toHaveLength(1)
    expect(twice[0].variants[0].name).toBe('Carbonara light')
  })

  it('removeVariant toglie solo quella indicata', () => {
    const withTwo = addVariant(addVariant([parent], 'p', v1), 'p', { ...v1, id: 'v2' })
    expect(removeVariant(withTwo, 'p', 'v1')[0].variants.map(v => v.id)).toEqual(['v2'])
  })

  it('hasVariants distingue chi ne ha da chi ha la lista vuota o assente', () => {
    expect(hasVariants(addVariant([parent], 'p', v1)[0])).toBe(true)
    expect(hasVariants({ variants: [] })).toBe(false)
    expect(hasVariants(parent)).toBe(false)
  })

  it('flattenCustomFoods espone anche le varianti alla ricerca', () => {
    const list = addVariant([parent, mine], 'p', v1)
    expect(flattenCustomFoods(list).map(f => f.id)).toEqual(['p', 'v1', '1'])
  })
})

describe('isNameTaken', () => {
  const semplice = { id: 's1', name: 'Bistecca Simone' }
  const composto = { id: 'c1', name: 'Carbonara', components: [{ name: 'Pasta' }] }
  const list = [semplice, composto]

  it('due alimenti semplici non possono chiamarsi uguale', () => {
    expect(isNameTaken(list, { name: 'Bistecca Simone', composite: false })).toBe(true)
  })

  it('due composti nemmeno', () => {
    expect(isNameTaken(list, { name: 'Carbonara', composite: true })).toBe(true)
  })

  it('un semplice PUÒ chiamarsi come un composto, e viceversa', () => {
    expect(isNameTaken(list, { name: 'Carbonara', composite: false })).toBe(false)
    expect(isNameTaken(list, { name: 'Bistecca Simone', composite: true })).toBe(false)
  })

  it('ignora maiuscole e spazi ai bordi: è lo stesso nome', () => {
    expect(isNameTaken(list, { name: '  bistecca SIMONE ', composite: false })).toBe(true)
  })

  it('in modifica la voce non fa conflitto con sé stessa', () => {
    expect(isNameTaken(list, { name: 'Bistecca Simone', composite: false, excludeId: 's1' })).toBe(false)
  })

  it('anche le varianti occupano un nome tra i composti', () => {
    const withVar = addVariant(list, 'c1', { id: 'v1', name: 'Carbonara Light', components: [{ name: 'Pasta' }] })
    expect(isNameTaken(withVar, { name: 'Carbonara Light', composite: true })).toBe(true)
  })

  it('nome vuoto non è mai "già preso"', () => {
    expect(isNameTaken(list, { name: '   ', composite: false })).toBe(false)
  })
})
