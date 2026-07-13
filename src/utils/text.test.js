import { describe, it, expect } from 'vitest'
import { titleCase } from './text'

describe('titleCase', () => {
  it('mette in maiuscolo l’iniziale di ogni parola', () => {
    expect(titleCase('pull day')).toBe('Pull Day')
  })
  it('lascia invariato il resto delle lettere', () => {
    expect(titleCase('pull Day')).toBe('Pull Day')
    expect(titleCase('PULL DAY')).toBe('PULL DAY')
  })
  it('gestisce stringa vuota e null', () => {
    expect(titleCase('')).toBe('')
    expect(titleCase(null)).toBe('')
    expect(titleCase(undefined)).toBe('')
  })
  it('preserva gli spazi multipli', () => {
    expect(titleCase('a  b')).toBe('A  B')
  })
})
