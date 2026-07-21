// Saluto in base alla fascia oraria. Le soglie seguono l'uso italiano: "buongiorno"
// fino a mezzogiorno, "buon pomeriggio" fino alle 18, poi "buonasera".
export function greetingKey(hour) {
  if (hour >= 5 && hour < 12) return 'home.greetingMorning'
  if (hour >= 12 && hour < 18) return 'home.greetingAfternoon'
  return 'home.greetingEvening'
}

// Impuro (legge l'orologio): a livello di modulo per tenere new Date() fuori dai componenti.
export const currentHour = () => new Date().getHours()

// Dati anagrafici che l'identità OAuth espone davvero. Con lo scope `email profile`
// Google restituisce SOLO nome, cognome, nome completo, email e foto: data di nascita,
// telefono e indirizzo NON ci sono e vanno chiesti all'utente.
export function identityFromUser(user) {
  const m = user?.user_metadata || {}
  return {
    fullName: (m.full_name || m.name || '').trim(),
    firstName: (m.given_name || '').trim(),
    lastName: (m.family_name || '').trim(),
    avatarUrl: m.avatar_url || m.picture || '',
    email: user?.email || '',
  }
}

// Nome da mostrare nel saluto: il nome proprio se c'è, altrimenti la prima parola del
// nome completo, altrimenti la parte locale dell'email. Stringa vuota se non c'è nulla,
// così chi lo usa può salutare senza nome invece di scrivere "undefined".
export function displayFirstName(user, profile) {
  const id = identityFromUser(user)
  const fromProfile = (profile?.first_name || '').trim()
  if (fromProfile) return fromProfile
  if (id.firstName) return id.firstName
  if (id.fullName) return id.fullName.split(/\s+/)[0]
  if (id.email) return id.email.split('@')[0]
  return ''
}
