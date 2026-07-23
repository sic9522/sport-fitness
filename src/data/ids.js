// Identificativi delle entita' locali (giornate, schede, esercizi, pasti, misure...).
//
// DEVONO essere UUID VALIDI: le tabelle Supabase usano colonne `uuid`, e un id fuori
// formato fa fallire l'INSERT. Siccome il mirror cattura l'errore e lo logga soltanto,
// il fallimento sarebbe SILENZIOSO: il dato resta in locale e non arriva mai sul cloud.
//
// Il punto delicato e' il CONTESTO NON SICURO. `crypto.randomUUID` esiste solo in secure
// context (HTTPS oppure localhost): aprendo l'app in LAN su http://192.168.x.x — cioe'
// da telefono — il metodo NON c'e'. Il vecchio ripiego era `String(Date.now())`, che
// produce "1753189200000": un id perfettamente valido per localStorage e rifiutato dal
// database. Ecco perche' le schede create dal telefono non si sincronizzavano.
//
// `crypto.getRandomValues`, invece, e' disponibile anche in http: e' il ripiego giusto.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// True se il valore e' un UUID nel formato accettato da Postgres.
export const isUuid = v => UUID_RE.test(String(v ?? ''))

// 16 byte casuali -> UUID v4 canonico.
function format(bytes) {
  const b = Uint8Array.from(bytes)
  b[6] = (b[6] & 0x0f) | 0x40 // versione 4
  b[8] = (b[8] & 0x3f) | 0x80 // variante RFC 4122
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export function newId() {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
    if (typeof crypto.getRandomValues === 'function') {
      return format(crypto.getRandomValues(new Uint8Array(16)))
    }
  }
  // Ultimo ripiego (ambienti senza Web Crypto): meno entropia, ma un UUID formalmente
  // valido e' comunque preferibile a un id che il database rifiuterebbe.
  return format(Array.from({ length: 16 }, () => Math.floor(Math.random() * 256)))
}
