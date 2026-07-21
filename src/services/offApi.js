import { normalizeOff, hasNutrition, isPlausibleNutrition } from '../utils/foodNormalize'

// Ricerca di un prodotto per codice a barre direttamente su Open Food Facts, usata come
// RIPIEGO quando il codice non è nel catalogo locale.
//
// Il catalogo importato contiene i ~210.000 prodotti marcati come venduti in Italia, ma
// OFF ne ha oltre 3 milioni: uno scaffale vero contiene prodotti importati, edizioni
// estere e voci senza il tag paese, che nel nostro sottoinsieme non ci sono. Invece di
// gonfiare il database, quando la scansione non trova nulla si chiede alla fonte.
//
// Resta un ripiego: la ricerca per nome e il primo tentativo dello scanner restano
// locali, quindi l'app continua a funzionare senza rete.
//
// Attribuzione: i dati sono di Open Food Facts, sotto licenza ODbL.
const API = 'https://world.openfoodfacts.org/api/v2/product'

// Solo i campi che servono: la risposta completa di un prodotto è enorme (decine di KB).
const FIELDS = [
  'code', 'product_name', 'product_name_it', 'product_name_en', 'brands',
  'countries_tags', 'serving_quantity', 'nutriments',
].join(',')

const TIMEOUT_MS = 6000 // meglio fallire in fretta che lasciare l'utente ad aspettare

// Restituisce una riga nella stessa forma di food_items, oppure null se il prodotto non
// esiste, non ha dati nutrizionali utilizzabili o la rete non risponde.
export async function fetchFoodByBarcodeOnline(barcode) {
  const code = String(barcode || '').trim()
  if (!code) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${API}/${encodeURIComponent(code)}.json?fields=${FIELDS}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const json = await res.json()
    if (json?.status !== 1 || !json.product) return null

    // Stesso normalizzatore dell'import in blocco: una sola implementazione, già testata.
    const row = normalizeOff({ ...json.product, code: json.product.code || code })
    if (!row || !hasNutrition(row) || !isPlausibleNutrition(row)) return null

    // `id` assente: questa riga non viene dal nostro DB e non va confusa con una salvata.
    return { ...row, id: null, online: true }
  } catch {
    // Rete assente, timeout o risposta malformata: per chi chiama è semplicemente
    // "non trovato", e il messaggio all'utente resta lo stesso.
    return null
  } finally {
    clearTimeout(timer)
  }
}
