import { describe, it, expect } from 'vitest'
import { buildBackup, isValidBackup, applyBackup, BACKUP_VERSION } from './backup'

// Storage finto compatibile con l'API localStorage usata da backup.js.
function makeStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    get length() { return map.size },
    key(i) { return [...map.keys()][i] ?? null },
    getItem(k) { return map.has(k) ? map.get(k) : null },
    setItem(k, v) { map.set(k, String(v)) },
    removeItem(k) { map.delete(k) },
    _map: map,
  }
}

describe('buildBackup', () => {
  it('include solo le chiavi fitpulse-* e la meta', () => {
    const s = makeStorage({ 'fitpulse-lang': 'it', 'fitpulse-goals': '{}', other: 'x' })
    const backup = buildBackup(s, '2026-07-13T00:00:00.000Z')
    expect(backup.version).toBe(BACKUP_VERSION)
    expect(backup.exportedAt).toBe('2026-07-13T00:00:00.000Z')
    expect(backup.data).toEqual({ 'fitpulse-lang': 'it', 'fitpulse-goals': '{}' })
    expect(backup.data.other).toBeUndefined()
  })
})

describe('isValidBackup', () => {
  it('true solo con un oggetto data', () => {
    expect(isValidBackup({ data: {} })).toBe(true)
    expect(isValidBackup({})).toBe(false)
    expect(isValidBackup(null)).toBe(false)
    expect(isValidBackup('nope')).toBe(false)
  })
})

describe('applyBackup', () => {
  it('sostituisce le chiavi fitpulse-* correnti con quelle del backup', () => {
    const s = makeStorage({ 'fitpulse-lang': 'en', 'fitpulse-old': 'x', keep: 'me' })
    const n = applyBackup({ version: 1, data: { 'fitpulse-lang': 'it', 'fitpulse-diario': '{}' } }, s)
    expect(n).toBe(2)
    expect(s.getItem('fitpulse-lang')).toBe('it')
    expect(s.getItem('fitpulse-diario')).toBe('{}')
    expect(s.getItem('fitpulse-old')).toBeNull() // chiave vecchia rimossa
    expect(s.getItem('keep')).toBe('me')         // le non-fitpulse restano intatte
  })
  it('ignora nel backup le chiavi senza prefisso', () => {
    const s = makeStorage({})
    applyBackup({ data: { 'fitpulse-a': '1', evil: '2' } }, s)
    expect(s.getItem('fitpulse-a')).toBe('1')
    expect(s.getItem('evil')).toBeNull()
  })
  it('lancia su backup non valido', () => {
    expect(() => applyBackup({}, makeStorage())).toThrow()
  })
})
