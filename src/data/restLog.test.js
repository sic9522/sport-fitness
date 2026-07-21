import { describe, it, expect } from 'vitest'
import { addRest, formatRest } from './restLog'

describe('addRest', () => {
  it('mette in testa il piu recente', () => {
    const out = addRest([{ id: 'a', seconds: 60, at: 1 }], { id: 'b', seconds: 90, at: 2 })
    expect(out.map(r => r.id)).toEqual(['b', 'a'])
  })

  it('tiene solo le ultime cinque voci', () => {
    let log = []
    for (let i = 1; i <= 8; i += 1) log = addRest(log, { id: String(i), seconds: 30, at: i })
    expect(log).toHaveLength(5)
    expect(log[0].id).toBe('8') // il piu recente resta
    expect(log.map(r => r.id)).not.toContain('1')
  })

  it('ignora le durate nulle o non valide: meglio nessuna riga che una a zero', () => {
    expect(addRest([], { id: 'x', seconds: 0, at: 1 })).toEqual([])
    expect(addRest([], { id: 'x', seconds: -5, at: 1 })).toEqual([])
    expect(addRest([], { id: 'x', seconds: 'abc', at: 1 })).toEqual([])
  })

  it('non esplode con un registro assente o corrotto', () => {
    expect(addRest(null, { id: 'x', seconds: 60, at: 1 })).toHaveLength(1)
    expect(addRest(undefined, { id: 'x', seconds: 0, at: 1 })).toEqual([])
  })

  it('arrotonda i secondi', () => {
    expect(addRest([], { id: 'x', seconds: 59.6, at: 1 })[0].seconds).toBe(60)
  })
})

describe('formatRest', () => {
  it('formatta in mm:ss con lo zero iniziale', () => {
    expect(formatRest(0)).toBe('00:00')
    expect(formatRest(45)).toBe('00:45')
    expect(formatRest(90)).toBe('01:30')
    expect(formatRest(3600)).toBe('60:00')
  })

  it('valori non validi diventano 00:00 invece di NaN', () => {
    expect(formatRest('abc')).toBe('00:00')
    expect(formatRest(-10)).toBe('00:00')
    expect(formatRest(null)).toBe('00:00')
  })
})
