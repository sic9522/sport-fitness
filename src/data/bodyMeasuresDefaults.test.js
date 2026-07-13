import { describe, it, expect } from 'vitest'
import {
  cleanValues, hasAnyValue, upsertEntry, removeEntry, latestEntry, latestValues,
} from './bodyMeasuresDefaults'

const entry = (id, date, values) => ({ id, date, values })

describe('cleanValues', () => {
  it('tiene solo i campi compilati, convertiti a numero', () => {
    expect(cleanValues({ waist: '82', hips: '', leanMass: '60.5', bogus: '9' })).toEqual({
      waist: 82,
      leanMass: 60.5,
    })
  })
})

describe('hasAnyValue', () => {
  it('true se almeno un campo valido è presente', () => {
    expect(hasAnyValue({ values: { waist: '80' } })).toBe(true)
    expect(hasAnyValue({ values: { waist: '', hips: '' } })).toBe(false)
    expect(hasAnyValue({ values: {} })).toBe(false)
  })
})

describe('upsertEntry', () => {
  it('sostituisce lo snapshot con la stessa data', () => {
    const list = [entry('a', '2026-03-01', { waist: 82 })]
    const out = upsertEntry(list, entry('b', '2026-03-01', { waist: 80 }))
    expect(out).toHaveLength(1)
    expect(out[0].values.waist).toBe(80)
  })
  it('aggiunge e ordina per data', () => {
    const out = upsertEntry([entry('a', '2026-03-03', {})], entry('b', '2026-03-01', { hips: 95 }))
    expect(out.map(x => x.id)).toEqual(['b', 'a'])
  })
})

describe('removeEntry / latestEntry', () => {
  const list = [entry('a', '2026-03-01', { waist: 82 }), entry('b', '2026-03-05', { waist: 80 })]
  it('rimuove per id', () => {
    expect(removeEntry(list, 'a').map(x => x.id)).toEqual(['b'])
  })
  it('latestEntry è la più recente', () => {
    expect(latestEntry(list).id).toBe('b')
    expect(latestEntry([])).toBeNull()
  })
})

describe('latestValues', () => {
  it('per ogni campo prende il valore più recente, anche da snapshot diversi', () => {
    const list = [
      entry('a', '2026-03-01', { waist: 84, leanMass: 60 }),
      entry('b', '2026-03-05', { waist: 82 }), // aggiorna solo waist
    ]
    const lv = latestValues(list)
    expect(lv.waist).toEqual({ value: 82, date: '2026-03-05' })
    expect(lv.leanMass).toEqual({ value: 60, date: '2026-03-01' }) // resta dal primo
  })
})
