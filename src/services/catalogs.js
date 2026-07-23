import { supabase } from '../lib/supabaseClient'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

// Ricerca fuzzy e multilingua via RPC Postgres search_catalog_exercises:
// matcha su tutte le lingue (it/en/es/fr/zh) con tolleranza ai refusi e
// restituisce il nome nella lingua `locale` (fallback italiano). Vedi le
// migrazioni 20260709120000_fuzzy_exercise_search / 20260709130000_exercise_i18n.
export async function searchCatalogExercises(query, { limit = 20, locale = 'it' } = {}) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('search_catalog_exercises', {
    search: query ?? '',
    p_locale: locale,
    max_results: limit,
  })
  if (error) throw error
  return data || []
}

const FOOD_COLS = 'id, source, source_id, name, brand, barcode, serving_size, serving_unit, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, salt_g, regions'

// Ricerca alimenti del campo "Nome". Via RPC e non con un ilike da qui, perche'
// l'ordinamento e' il punto: gli alimenti GENERICI ("Bistecca di manzo") vanno
// davanti ai prodotti confezionati, e i doppioni vanno tolti. Ordinando per nome,
// come si faceva prima, "bistecca" restituiva due formaggi e due volte lo stesso
// lombo di suino. Ranking e deduplica stanno nella migrazione
// 20260723120000_generic_foods_and_search.sql (funzione search_food_items).
// Sotto i 2 caratteri la RPC non cerca nulla: nessun risultato, nessun costo.
export async function searchFoodItems(query, { limit = 20 } = {}) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('search_food_items', {
    search: query ?? '',
    max_results: limit,
  })
  if (error) throw error
  return data || []
}

// true se l'alimento e' uno dei generici curati da noi (valori medi, niente marca).
export const isGenericFood = item => item?.source === 'generic'

// Elenco alfabetico del catalogo per la pagina Prodotti, una pagina per volta.
//
// Il catalogo ha centinaia di migliaia di righe: si legge SOLO a pagine, mai tutto.
// Due "secchi" letti in sequenza, non un filtro regex: un `~*` sul nome non usa
// l'indice e la query va in timeout, mentre un confronto d'intervallo (`name >= 'A'`)
// lo usa e resta sotto il secondo anche a 150.000 righe di distanza.
//   - `specials: false` → nomi che iniziano per lettera (la collation ordina
//     accentate e minuscole insieme alla lettera base: "À la tartar" sta con la A);
//   - `specials: true`  → tutto il resto (cifre, punteggiatura, simboli), che con
//     l'ordinamento naturale starebbe in TESTA e che la pagina mostra invece in fondo.
//
// Paginazione a offset (non keyset): i nomi non sono unici, quindi un `name > ultimo`
// salterebbe i prodotti omonimi a cavallo di due pagine.
// `orderBy` diverso da 'name' (kcal, macro) = ordinamento della pagina Prodotti:
// in quel caso i due secchi non servono, l'ordine è numerico e `specials` viene
// ignorato. Sui nutrienti i valori mancanti vanno in fondo: "non dichiarato" non
// è "zero", e non deve occupare la testa della classifica.
export async function listFoodItems({
  page = 0, pageSize = 50, specials = false, region,
  orderBy = 'name', ascending = true,
} = {}) {
  const client = requireSupabase()
  const from = page * pageSize
  const byName = orderBy === 'name'

  let request = client
    .from('food_items')
    .select(FOOD_COLS)
    .order(orderBy, { ascending, nullsFirst: false })
    .order('id', { ascending: true }) // ordine stabile tra pari: le pagine non ballano
    .range(from, from + pageSize - 1)

  if (byName) request = specials ? request.lt('name', 'A') : request.gte('name', 'A')
  if (region) request = request.contains('regions', [region])

  const { data, error } = await request
  if (error) throw error
  return data || []
}

// Tutti gli alimenti generici (quelli curati da noi): sono poche centinaia, si
// leggono in una volta e restano in memoria. La "lista personalizzata" li unisce
// agli alimenti dell'utente e da lì filtra e ordina senza altre query.
export async function listGenericFoods({ limit = 500 } = {}) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('food_items')
    .select(FOOD_COLS)
    .eq('source', 'generic')
    .order('name', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data || []
}

// Lo stesso barcode può comparire più volte: un prodotto presente sia in Open Food Facts
// sia tra i "branded" di FoodData Central produce due righe con lo stesso GTIN. Perciò NON
// si usa maybeSingle(), che va in errore con più di una riga e farebbe dire allo scanner
// "codice non trovato" per un prodotto che invece esiste. Si prende la prima, preferendo
// Open Food Facts: è la fonte con i prodotti europei e le etichette che l'utente scansiona.
export async function getFoodItemByBarcode(barcode) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('food_items')
    .select('id, source, source_id, name, brand, barcode, serving_size, serving_unit, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, salt_g, regions')
    .eq('barcode', barcode)
    .order('source', { ascending: true }) // 'fdc' < 'off' → invertito sotto per preferire OFF
    .limit(2)

  if (error) throw error
  if (!data?.length) return null
  return data.find(r => r.source === 'off') || data[0]
}
