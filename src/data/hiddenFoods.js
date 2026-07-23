// Prodotti che l'utente ha scelto di non vedere più.
//
// "Elimina" su un prodotto del CATALOGO non può cancellare la riga: quel catalogo
// è condiviso da tutti (e la RLS lo vieta). Quello che l'utente intende però è
// "non mostrarmelo più", ed è quello che si registra qui: un elenco di id, suo.
//
// Local-first come il resto dell'app: la lista vive in localStorage e funziona
// offline e da non loggati; da loggato si specchia sull'account
// (`services/hiddenFoods` + `hooks/useHiddenFoods`), così vale su tutti i
// dispositivi.
const KEY = 'fitpulse-alimenti-nascosti'

export function loadHiddenFoods() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (Array.isArray(saved)) return saved.filter(Boolean)
  } catch {
    // dato corrotto → niente di nascosto
  }
  return []
}

export function saveHiddenFoods(ids) {
  localStorage.setItem(KEY, JSON.stringify([...new Set(ids || [])]))
}

// Unione senza doppioni: nascondere è un'operazione che si somma, mai in conflitto.
export const addHiddenFoods = (ids, add) => [...new Set([...(ids || []), ...(add || [])])]

// Toglie dalla lista quello che l'utente non vuole vedere. Il Set si costruisce
// una volta sola dal chiamante: filtrare con `includes` su un array farebbe una
// scansione per ogni riga di catalogo mostrata.
export function filterHidden(list, hiddenSet) {
  if (!hiddenSet?.size) return list || []
  return (list || []).filter(f => !hiddenSet.has(f?.id))
}
