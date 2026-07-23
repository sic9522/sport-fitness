import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { loadHiddenFoods, saveHiddenFoods, addHiddenFoods } from '../data/hiddenFoods'
import { fetchHiddenFoods, pushHiddenFoods, clearHiddenFoods } from '../services/hiddenFoods'

// Prodotti nascosti: locali sempre, sincronizzati sull'account quando c'è.
//
// La riconciliazione è una UNIONE, non un confronto: nascondere è un'azione che
// si somma e non può entrare in conflitto con sé stessa. Chi nasconde qualcosa
// dal telefono e qualcos'altro dal portatile se li ritrova nascosti entrambi,
// senza dover decidere quale delle due liste "vince".
// Il ripristino è l'unica operazione che TOGLIE, e cancella anche sul cloud.
export function useHiddenFoods() {
  const { user } = useAuth()
  const [hidden, setHidden] = useState(loadHiddenFoods)
  const mergedFor = useRef(null) // utente per cui l'unione è già stata fatta

  const commit = useCallback(ids => {
    setHidden(ids)
    saveHiddenFoods(ids)
  }, [])

  // Login: unisce quello che c'è sul cloud a quello che c'è qui, e ripassa al
  // cloud ciò che ancora non conosce (es. nascosti da non loggato).
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return undefined
    if (mergedFor.current === user.id) return undefined
    mergedFor.current = user.id

    let alive = true
    fetchHiddenFoods()
      .then(async remote => {
        const local = loadHiddenFoods()
        const missing = local.filter(id => !remote.includes(id))
        if (missing.length) await pushHiddenFoods(user.id, missing)
        if (alive) commit(addHiddenFoods(local, remote))
      })
      .catch(() => {
        // Cloud non raggiungibile (o migrazione non ancora eseguita): la lista
        // locale continua a valere. Nascondere non è un'operazione che vale la
        // pena interrompere con un errore.
        mergedFor.current = null
      })
    return () => { alive = false }
  }, [user, commit])

  // `cloudIds` = il sottoinsieme da specchiare sull'account, di norma tutto.
  // Fa eccezione la roba creata dall'utente: i suoi id sono locali e la tabella
  // hidden_food_items ha una chiave esterna su food_items, quindi il DB li
  // rifiuterebbe. Restano nascosti qui, dove peraltro vivono.
  const hide = useCallback((ids, cloudIds = ids) => {
    const list = (ids || []).filter(Boolean)
    if (!list.length) return
    commit(addHiddenFoods(loadHiddenFoods(), list))
    const toPush = (cloudIds || []).filter(Boolean)
    if (isSupabaseConfigured && user && toPush.length) {
      pushHiddenFoods(user.id, toPush).catch(() => {})
    }
  }, [user, commit])

  const restoreAll = useCallback(() => {
    commit([])
    if (isSupabaseConfigured && user) clearHiddenFoods(user.id).catch(() => {})
  }, [user, commit])

  return { hidden, hiddenSet: new Set(hidden), hide, restoreAll }
}

export default useHiddenFoods
