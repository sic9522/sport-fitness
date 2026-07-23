// Stato osservabile della sincronizzazione cloud.
//
// Perche' esiste: prima ogni fallimento di sync finiva in un console.error e basta.
// Dal punto di vista dell'utente il dato "non si sincronizzava" senza alcun motivo
// visibile, e dal punto di vista di chi sviluppa era impossibile capire quale dei due
// lati (riconciliazione o mirror) si fosse rotto, soprattutto da telefono dove la
// console non si apre. Qui lo stato e' esplicito e mostrabile a schermo.
//
// Store minimale in stile pub/sub, compatibile con useSyncExternalStore.

// phase: 'off' (non loggato o Supabase non configurato) | 'idle' | 'syncing' | 'ok' | 'error'
let state = { phase: 'off', at: null, error: null, scope: null }

const listeners = new Set()

function emit(next) {
  state = { ...state, ...next }
  listeners.forEach(l => l())
}

export function subscribeSync(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getSyncState = () => state

// `scope` identifica cosa si sta sincronizzando (giornate, diario, idratazione...):
// serve a capire QUALE ponte fallisce quando ce ne sono piu' d'uno attivi.
export const syncStarted = scope => emit({ phase: 'syncing', scope, error: null })
export const syncOk = scope => emit({ phase: 'ok', scope, error: null, at: Date.now() })
export const syncIdle = () => emit({ phase: 'idle', error: null })
export const syncOff = () => emit({ phase: 'off', error: null, scope: null })

// Il messaggio viene normalizzato: gli errori PostgREST portano code/details utili che
// altrimenti si perderebbero nello stringify di default.
export function syncFailed(scope, err) {
  const parts = [err?.message || String(err)]
  if (err?.code) parts.unshift(`[${err.code}]`)
  if (err?.details) parts.push(`· ${err.details}`)
  if (err?.hint) parts.push(`· ${err.hint}`)
  emit({ phase: 'error', scope, error: parts.join(' '), at: Date.now() })
}
