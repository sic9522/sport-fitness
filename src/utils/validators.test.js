import { describe, it, expect } from 'vitest'
import {
  isNonEmpty, isEmail, isMinLength, isPhone, isPostalCode, isPositiveNumber, isPastDate,
} from './validators'

describe('isNonEmpty', () => {
  it('false su vuoto/spazi/null', () => {
    expect(isNonEmpty('')).toBe(false)
    expect(isNonEmpty('   ')).toBe(false)
    expect(isNonEmpty(null)).toBe(false)
  })
  it('true su testo', () => {
    expect(isNonEmpty(' a ')).toBe(true)
  })
})

describe('isEmail', () => {
  it('accetta email valide', () => {
    expect(isEmail('a@b.co')).toBe(true)
    expect(isEmail('  mario.rossi@example.com ')).toBe(true)
  })
  it('rifiuta email non valide', () => {
    expect(isEmail('a@b')).toBe(false)
    expect(isEmail('ab.co')).toBe(false)
    expect(isEmail('a b@c.co')).toBe(false)
  })
})

describe('isMinLength', () => {
  it('rispetta la lunghezza minima', () => {
    expect(isMinLength('abc', 3)).toBe(true)
    expect(isMinLength('ab', 3)).toBe(false)
  })
})

describe('isPhone', () => {
  it('accetta numeri plausibili', () => {
    expect(isPhone('+39 333 1234567')).toBe(true)
    expect(isPhone('06-1234567')).toBe(true)
  })
  it('rifiuta troppo corti o con lettere', () => {
    expect(isPhone('123')).toBe(false)
    expect(isPhone('06 abc')).toBe(false)
  })
})

describe('isPostalCode', () => {
  it('accetta solo 5 cifre', () => {
    expect(isPostalCode('00185')).toBe(true)
    expect(isPostalCode('1234')).toBe(false)
    expect(isPostalCode('123456')).toBe(false)
  })
})

describe('isPositiveNumber', () => {
  it('true solo per numeri > 0', () => {
    expect(isPositiveNumber('10')).toBe(true)
    expect(isPositiveNumber(0)).toBe(false)
    expect(isPositiveNumber(-3)).toBe(false)
    expect(isPositiveNumber('x')).toBe(false)
  })
})

describe('isPastDate', () => {
  it('true per date passate, false per future o non valide', () => {
    expect(isPastDate('2000-01-01')).toBe(true)
    expect(isPastDate('2999-01-01')).toBe(false)
    expect(isPastDate('')).toBe(false)
    expect(isPastDate('non-una-data')).toBe(false)
  })
})
