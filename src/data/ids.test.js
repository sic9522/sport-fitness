import { describe, it, expect, afterEach, vi } from 'vitest'
import { newId, isUuid } from './ids'

// globalThis.crypto e' una proprieta' di sola lettura: si sostituisce solo con
// stubGlobal, e unstubAllGlobals la ripristina da se'.
const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isUuid', () => {
  it('accetta un UUID canonico', () => {
    expect(isUuid('3f2504e0-4f89-41d3-9a0c-0305e82c3301')).toBe(true)
    expect(isUuid('3F2504E0-4F89-41D3-9A0C-0305E82C3301')).toBe(true) // maiuscole
  })

  it('rifiuta i vecchi id da timestamp: sono quelli che rompevano il sync', () => {
    expect(isUuid('1753189200000')).toBe(false)
  })

  it('rifiuta valori vuoti o malformati', () => {
    expect(isUuid('')).toBe(false)
    expect(isUuid(null)).toBe(false)
    expect(isUuid(undefined)).toBe(false)
    expect(isUuid('3f2504e0-4f89-41d3-9a0c')).toBe(false)
  })
})

describe('newId', () => {
  it('produce un UUID valido e distinto a ogni chiamata', () => {
    const a = newId()
    const b = newId()
    expect(isUuid(a)).toBe(true)
    expect(isUuid(b)).toBe(true)
    expect(a).not.toBe(b)
  })

  it('CONTESTO NON SICURO (http in LAN): senza randomUUID resta un UUID valido', () => {
    // Su http://192.168.x.x crypto.randomUUID non esiste. Prima si ripiegava su
    // Date.now(), che il database rifiutava: e' il bug che questo test blocca.
    vi.stubGlobal('crypto', { getRandomValues })
    const id = newId()
    expect(isUuid(id)).toBe(true)
    expect(id).not.toMatch(/^\d+$/)
  })

  it('senza Web Crypto del tutto ripiega comunque su un UUID valido', () => {
    vi.stubGlobal('crypto', undefined)
    const id = newId()
    expect(isUuid(id)).toBe(true)
  })

  it('rispetta versione 4 e variante RFC 4122', () => {
    vi.stubGlobal('crypto', { getRandomValues })
    const id = newId()
    expect(id[14]).toBe('4')                       // versione
    expect('89ab').toContain(id[19].toLowerCase()) // variante
  })
})
