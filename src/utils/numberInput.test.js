import { describe, it, expect } from 'vitest'
import { onlyDigits, decimalInput } from './numberInput'

describe('onlyDigits', () => {
  it('tiene solo le cifre', () => {
    expect(onlyDigits('12a3')).toBe('123')
    expect(onlyDigits('1,5')).toBe('15')
    expect(onlyDigits('-40')).toBe('40')
  })

  it('regge vuoto, null e undefined', () => {
    expect(onlyDigits('')).toBe('')
    expect(onlyDigits(null)).toBe('')
    expect(onlyDigits(undefined)).toBe('')
  })
})

describe('decimalInput', () => {
  it('la virgola diventa punto, così Number() sa leggerlo', () => {
    expect(decimalInput('1,5')).toBe('1.5')
    expect(Number(decimalInput('10,25'))).toBe(10.25)
  })

  it('scarta lettere e simboli', () => {
    expect(decimalInput('12,5 g')).toBe('12.5')
    expect(decimalInput('-3')).toBe('3')
  })

  it('un solo separatore: i successivi si perdono, non spezzano il numero', () => {
    expect(decimalInput('1,5,3')).toBe('1.53')
    expect(decimalInput('1.2.3')).toBe('1.23')
  })

  it('lascia scrivere il separatore da solo mentre si digita', () => {
    expect(decimalInput('1,')).toBe('1.')
    expect(decimalInput('')).toBe('')
  })
})
