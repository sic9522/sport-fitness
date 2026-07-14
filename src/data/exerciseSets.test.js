import { describe, it, expect } from 'vitest'
import { serieCount, editorRows, rowsValid, buildExercise } from './exerciseSets'

describe('serieCount', () => {
  it('clampa tra 1 e 5, default 3 se non valido', () => {
    expect(serieCount({ serie: '4' })).toBe(4)
    expect(serieCount({ serie: 9 })).toBe(5)
    expect(serieCount({ serie: 0 })).toBe(1)
    expect(serieCount({ serie: 'x' })).toBe(3)
    expect(serieCount({})).toBe(3)
  })
})

describe('editorRows', () => {
  it('non split → una sola riga condivisa', () => {
    expect(editorRows({ serie: '3', reps: '8', kg: '20' })).toEqual([{ reps: '8', kg: '20' }])
  })
  it('split → N righe dai sets, come stringhe', () => {
    const ex = { serie: '2', split: true, sets: [{ reps: 10, kg: 20 }, { reps: 8, kg: 25 }] }
    expect(editorRows(ex)).toEqual([{ reps: '10', kg: '20' }, { reps: '8', kg: '25' }])
  })
  it('split con sets più corti dei conteggio → riempie con reps/kg base', () => {
    const ex = { serie: '3', split: true, reps: '8', kg: '20', sets: [{ reps: '10', kg: '30' }] }
    expect(editorRows(ex)).toEqual([
      { reps: '10', kg: '30' },
      { reps: '8', kg: '20' },
      { reps: '8', kg: '20' },
    ])
  })
})

describe('rowsValid', () => {
  it('richiede reps e kg su ogni riga', () => {
    expect(rowsValid([{ reps: '8', kg: '20' }])).toBe(true)
    expect(rowsValid([{ reps: '8', kg: '' }])).toBe(false)
    expect(rowsValid([])).toBe(false)
  })
})

describe('buildExercise', () => {
  const base = { id: 'x', titolo: 'Panca', foto: null }
  it('non split: reps/kg dalla riga, niente sets', () => {
    const out = buildExercise(base, { serie: 3, split: false, rows: [{ reps: '8', kg: '20' }] })
    expect(out).toMatchObject({ id: 'x', serie: '3', split: false, reps: '8', kg: '20' })
    expect(out.sets).toBeUndefined()
  })
  it('split: sets = righe, reps/kg dalla prima serie', () => {
    const out = buildExercise(base, {
      serie: 2, split: true, rows: [{ reps: '10', kg: '20' }, { reps: '8', kg: '25' }],
    })
    expect(out.split).toBe(true)
    expect(out.sets).toEqual([{ reps: '10', kg: '20' }, { reps: '8', kg: '25' }])
    expect(out.reps).toBe('10')
    expect(out.kg).toBe('20')
  })
  it('split: taglia i sets in eccesso al numero di serie', () => {
    const out = buildExercise(base, {
      serie: 1, split: true, rows: [{ reps: '10', kg: '20' }, { reps: '8', kg: '25' }],
    })
    expect(out.sets).toHaveLength(1)
  })
  it('passando da split a non split rimuove sets residui', () => {
    const withSets = { ...base, split: true, sets: [{ reps: '10', kg: '20' }] }
    const out = buildExercise(withSets, { serie: 3, split: false, rows: [{ reps: '8', kg: '20' }] })
    expect(out.sets).toBeUndefined()
    expect(out.split).toBe(false)
  })
})