import { describe, it, expect } from 'vitest'
import { isExistingUser } from './auth'

// Supabase, per non rivelare quali indirizzi sono registrati, NON risponde con un errore
// quando si prova a registrare un'email gia' esistente (con la conferma email attiva):
// restituisce un utente dall'aspetto normale ma con `identities` VUOTA. E' l'unico
// segnale disponibile, ed e' facile scambiarlo per una registrazione riuscita.
describe('isExistingUser', () => {
  it("riconosce l'utente gia' registrato dalla lista identities vuota", () => {
    expect(isExistingUser({ user: { id: 'x', email: 'a@b.it', identities: [] } })).toBe(true)
  })

  it('una registrazione vera ha almeno un’identita', () => {
    expect(isExistingUser({ user: { id: 'x', identities: [{ provider: 'email' }] } })).toBe(false)
  })

  it('risposte incomplete non vengono scambiate per utenti esistenti', () => {
    expect(isExistingUser(null)).toBe(false)
    expect(isExistingUser({})).toBe(false)
    expect(isExistingUser({ user: null })).toBe(false)
    expect(isExistingUser({ user: { id: 'x' } })).toBe(false) // identities assente
  })
})
