import { describe, it, expect } from 'vitest'
import { greetingKey, identityFromUser, displayFirstName } from './greeting'

describe('greetingKey', () => {
  it('mattina dalle 5 alle 11', () => {
    expect(greetingKey(5)).toBe('home.greetingMorning')
    expect(greetingKey(9)).toBe('home.greetingMorning')
    expect(greetingKey(11)).toBe('home.greetingMorning')
  })

  it('pomeriggio dalle 12 alle 17', () => {
    expect(greetingKey(12)).toBe('home.greetingAfternoon')
    expect(greetingKey(17)).toBe('home.greetingAfternoon')
  })

  it('sera dalle 18 e per tutta la notte', () => {
    expect(greetingKey(18)).toBe('home.greetingEvening')
    expect(greetingKey(23)).toBe('home.greetingEvening')
    expect(greetingKey(0)).toBe('home.greetingEvening')
    expect(greetingKey(4)).toBe('home.greetingEvening')
  })
})

describe('identityFromUser', () => {
  it('legge i campi che Google fornisce con lo scope email profile', () => {
    const user = {
      email: 'mario.rossi@gmail.com',
      user_metadata: {
        full_name: 'Mario Rossi',
        given_name: 'Mario',
        family_name: 'Rossi',
        avatar_url: 'https://lh3.googleusercontent.com/a/foto',
      },
    }
    expect(identityFromUser(user)).toEqual({
      fullName: 'Mario Rossi',
      firstName: 'Mario',
      lastName: 'Rossi',
      avatarUrl: 'https://lh3.googleusercontent.com/a/foto',
      email: 'mario.rossi@gmail.com',
    })
  })

  it('accetta le varianti `name` e `picture`', () => {
    const id = identityFromUser({ user_metadata: { name: 'Anna Verdi', picture: 'https://x/y.png' } })
    expect(id.fullName).toBe('Anna Verdi')
    expect(id.avatarUrl).toBe('https://x/y.png')
  })

  it('utente assente o senza metadati non esplode', () => {
    expect(identityFromUser(null)).toEqual({ fullName: '', firstName: '', lastName: '', avatarUrl: '', email: '' })
    expect(identityFromUser({}).fullName).toBe('')
  })
})

describe('displayFirstName', () => {
  const user = { email: 'mario.rossi@gmail.com', user_metadata: { given_name: 'Mario', full_name: 'Mario Rossi' } }

  it('il profilo salvato ha la precedenza sull’identità del provider', () => {
    expect(displayFirstName(user, { first_name: 'Mariolino' })).toBe('Mariolino')
  })

  it('senza profilo usa il nome proprio del provider', () => {
    expect(displayFirstName(user, null)).toBe('Mario')
  })

  it('senza nome proprio prende la prima parola del nome completo', () => {
    expect(displayFirstName({ user_metadata: { full_name: 'Anna Maria Verdi' } }, null)).toBe('Anna')
  })

  it('come ultima risorsa la parte locale dell’email', () => {
    expect(displayFirstName({ email: 'simone@example.com', user_metadata: {} }, null)).toBe('simone')
  })

  it('senza nulla restituisce stringa vuota, non undefined', () => {
    expect(displayFirstName(null, null)).toBe('')
  })
})
