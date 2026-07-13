import { describe, it, expect } from 'vitest'
import {
  sortByDate, upsertEntry, removeEntry, latestEntry, previousEntry, weightDelta, newWeightId,
} from './weightDefaults'

const e = (id, date, kg) => ({ id, date, kg })

describe('sortByDate', () => {
  it('ordina per data crescente senza mutare l’input', () => {
    const input = [e('b', '2026-03-02', 80), e('a', '2026-03-01', 81)]
    const out = sortByDate(input)
    expect(out.map(x => x.id)).toEqual(['a', 'b'])
    expect(input[0].id).toBe('b') // input intatto
  })
})

describe('upsertEntry', () => {
  it('aggiunge una nuova misura ordinata', () => {
    const out = upsertEntry([e('a', '2026-03-01', 81)], e('b', '2026-03-03', 79))
    expect(out.map(x => x.id)).toEqual(['a', 'b'])
  })
  it('sostituisce la misura con la stessa data', () => {
    const out = upsertEntry([e('a', '2026-03-01', 81)], e('b', '2026-03-01', 80))
    expect(out).toHaveLength(1)
    expect(out[0].kg).toBe(80)
  })
  it('converte kg in numero', () => {
    const out = upsertEntry([], e('a', '2026-03-01', '77.5'))
    expect(out[0].kg).toBe(77.5)
  })
})

describe('removeEntry', () => {
  it('rimuove per id', () => {
    expect(removeEntry([e('a', '2026-03-01', 81), e('b', '2026-03-02', 80)], 'a')).toEqual([
      e('b', '2026-03-02', 80),
    ])
  })
})

describe('latest / previous / delta', () => {
  const list = [e('a', '2026-03-01', 81), e('b', '2026-03-02', 80.4), e('c', '2026-03-03', 79.9)]
  it('latestEntry ritorna la più recente', () => {
    expect(latestEntry(list).id).toBe('c')
    expect(latestEntry([])).toBeNull()
  })
  it('previousEntry ritorna la penultima', () => {
    expect(previousEntry(list).id).toBe('b')
    expect(previousEntry([e('a', '2026-03-01', 81)])).toBeNull()
  })
  it('weightDelta è la differenza ultima-penultima, 1 decimale', () => {
    expect(weightDelta(list)).toBe(-0.5)
    expect(weightDelta([e('a', '2026-03-01', 81)])).toBeNull()
  })
})

describe('newWeightId', () => {
  it('ritorna id stringa unici', () => {
    expect(newWeightId()).not.toBe(newWeightId())
  })
})
