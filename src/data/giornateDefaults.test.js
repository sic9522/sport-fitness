import { describe, it, expect } from 'vitest'
import { dayIndex, dayLabelKey, giornataName, schedaNameTaken, newId } from './giornateDefaults'

describe('dayIndex / dayLabelKey', () => {
  it('mappa i giorni al loro indice settimanale', () => {
    expect(dayIndex('mon')).toBe(0)
    expect(dayIndex('sun')).toBe(6)
    expect(dayIndex('boh')).toBe(-1)
  })
  it('ritorna la chiave i18n del giorno, o la chiave stessa se ignota', () => {
    expect(dayLabelKey('wed')).toBe('day.wed')
    expect(dayLabelKey('boh')).toBe('boh')
  })
})

describe('giornataName', () => {
  const t = k => k // identità: verifichiamo QUALE chiave viene tradotta
  it('usa il giorno tradotto se presente', () => {
    expect(giornataName({ day: 'mon' }, t)).toBe('day.mon')
  })
  it('usa il nome libero se non c’è il giorno', () => {
    expect(giornataName({ nome: 'Scheda A' }, t)).toBe('Scheda A')
    expect(giornataName({}, t)).toBe('')
  })
})

describe('schedaNameTaken', () => {
  const schede = [{ nome: 'Push' }, { nome: 'Pull ' }]
  it('confronta trim + case-insensitive', () => {
    expect(schedaNameTaken(schede, 'push')).toBe(true)
    expect(schedaNameTaken(schede, '  PULL')).toBe(true)
    expect(schedaNameTaken(schede, 'Legs')).toBe(false)
  })
})

describe('newId', () => {
  it('ritorna una stringa non vuota e diversa a ogni chiamata', () => {
    const a = newId()
    const b = newId()
    expect(typeof a).toBe('string')
    expect(a.length).toBeGreaterThan(0)
    expect(a).not.toBe(b)
  })
})
