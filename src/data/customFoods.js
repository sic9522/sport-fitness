// Alimenti PERSONALI: quelli che l'utente si crea da sé (Prodotti → Personali)
// perché nel catalogo non esistono o hanno valori diversi dai suoi.
//
// Vivono in localStorage, non sul catalogo condiviso: sono roba di chi li scrive,
// e devono funzionare anche senza connessione. La ricerca del campo "Nome" li
// unisce ai risultati del database (vedi `mergeCustomFoods`).
//
// FORMA: la stessa di una riga di `food_items` — `name`, `calories_kcal`,
// `protein_g`… — così passano per `baseFromFoodItem`/`scaleNutrients` e per la
// tendina dei risultati senza un solo `if`. Valori sempre PER 100 g, come il
// catalogo: è ciò che rende confrontabili le due fonti.
// `source: 'custom'` li distingue da 'generic' e dai prodotti importati.
const KEY = 'fitpulse-alimenti-personali'

export const CUSTOM_FOOD_SOURCE = 'custom'

export function loadCustomFoods() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (Array.isArray(saved)) return saved
  } catch {
    // dato corrotto → nessun alimento personale
  }
  return []
}

export function saveCustomFoods(list) {
  localStorage.setItem(KEY, JSON.stringify(list || []))
}

// Inserisce o sostituisce (per id) e riordina per nome.
export function upsertCustomFood(list, food) {
  const others = (list || []).filter(f => f.id !== food.id)
  return [...others, food].sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

export function removeCustomFood(list, id) {
  return (list || []).filter(f => f.id !== id)
}

export const isCustomFood = item => item?.source === CUSTOM_FOOD_SOURCE

// --- Alimenti COMPOSTI (una ricetta: più alimenti in una voce sola) ---

// Tetto agli ingredienti: oltre non è più un alimento, è un menù — e venti campi
// di ricerca aperti insieme sono già tanti da tenere in una modale.
export const MAX_COMPONENTS = 20

// Colonne nutrizionali di una riga di catalogo, nell'ordine in cui si mostrano.
const NUTRIENT_COLS = ['calories_kcal', 'protein_g', 'carbs_g', 'fat_g', 'sugar_g', 'fiber_g']

export const isCompositeFood = item => Array.isArray(item?.components) && item.components.length > 0

// --- VARIANTI di un alimento composto ---
//
// Una variante è lo stesso piatto fatto un po' diverso (la carbonara con la
// pancetta invece del guanciale). Vive DENTRO il composto da cui nasce, così
// l'elenco resta corto e le varianti si trovano dove uno le cerca: sotto
// l'originale. Ha la stessa forma di un composto, senza varianti sue.
// Tetto alle varianti: nella modale "Aggiungi un pasto" diventano bottoni su una
// riga sola (V1…V5). Oltre non ci starebbero, e un piatto con sei versioni
// diverse probabilmente sono due piatti.
export const MAX_VARIANTS = 5

export const hasVariants = item => Array.isArray(item?.variants) && item.variants.length > 0

export const canAddVariant = item => (item?.variants?.length ?? 0) < MAX_VARIANTS

export function addVariant(list, parentId, variant) {
  return (list || []).map(f => (
    f.id === parentId
      ? { ...f, variants: [...(f.variants || []).filter(v => v.id !== variant.id), variant] }
      : f
  ))
}

export function removeVariant(list, parentId, variantId) {
  return (list || []).map(f => (
    f.id === parentId ? { ...f, variants: (f.variants || []).filter(v => v.id !== variantId) } : f
  ))
}

// Elenco piatto: originali e varianti insieme. Serve agli ELENCHI (la lista
// personalizzata in Prodotti) e al controllo dei nomi doppi — NON alla ricerca
// del diario, dove si cerca il piatto e la variante si sceglie dopo, coi bottoni
// V1…V5 (vedi FoodEditor): sette righe quasi identiche in tendina sarebbero solo
// un ostacolo tra l'utente e il piatto che sta cercando.
export function flattenCustomFoods(list) {
  return (list || []).flatMap(f => [f, ...(f.variants || [])])
}

// --- Nomi doppi ---
//
// Due voci con lo stesso nome sarebbero indistinguibili nella tendina di
// ricerca: uno sceglierebbe a caso. Il controllo ignora maiuscole e spazi ai
// bordi, perché "bistecca simone" e "Bistecca Simone" sono la stessa cosa (i
// nomi vengono comunque salvati con le iniziali maiuscole).
//
// I due insiemi restano SEPARATI: un alimento semplice e un composto possono
// chiamarsi uguale — sono cose diverse (l'ingrediente e il piatto), e nella
// tendina il composto si distingue dall'asterisco.
// Le varianti contano tra i composti: anche loro finiscono in ricerca.
const sameName = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase()

export function isNameTaken(list, { name, composite, excludeId = null }) {
  if (!String(name ?? '').trim()) return false
  return flattenCustomFoods(list).some(f => (
    f.id !== excludeId && isCompositeFood(f) === composite && sameName(f.name, name)
  ))
}

// Nome come si mostra: i composti portano un asterisco, perché i loro valori
// sono una STIMA (vedi averageNutrients) e non un dato letto da un'etichetta.
export function foodDisplayName(item) {
  const name = item?.name ?? ''
  return isCompositeFood(item) ? `${name} *` : name
}

// kcal senza decimali, macro a un decimale: la precisione che ha senso mostrare.
const roundCol = (col, v) => (col === 'calories_kcal' ? Math.round(v) : Math.round(v * 10) / 10)

// Valori di un alimento composto, a partire dagli ingredienti e dai loro grammi.
// Ogni ingrediente porta i propri valori PER 100 g più i `grams` effettivamente usati.
//
// Due risultati, che rispondono a due domande diverse:
//   * `totals`  = quanto pesa il piatto intero (somma dei contributi:
//                 valore/100 g × grammi ÷ 100).
//   * `per100`  = quanto vale 100 g dell'ALIMENTO PRINCIPALE, cioè il primo.
//
// Perché il riferimento è il principale e non il peso totale: è così che si
// ragiona a tavola. "Carbonara: 800 kcal in totale, con 200 g di pasta" vuol
// dire che chi ne pesa 100 g di pasta si mangia 400 kcal — ed è esattamente il
// numero che serve quando poi si scrive "100 g" nel diario. Col peso totale
// (pasta + uova + guanciale) quel 100 g non corrisponderebbe a niente di
// misurabile in cucina.
//
// Un nutriente entra nel conto solo dagli ingredienti che lo dichiarano; se non
// lo dichiara nessuno resta null (non dichiarato non è zero). Senza grammi sul
// principale il "per 100 g" non è calcolabile: null, e il salvataggio si blocca.
export function compositeNutrients(components) {
  const list = (components || []).filter(Boolean)
  const grams = c => {
    const g = Number(c?.grams)
    return Number.isFinite(g) && g > 0 ? g : null
  }

  const raw = {}
  for (const col of NUTRIENT_COLS) {
    let sum = 0
    let seen = false
    for (const c of list) {
      const v = c?.[col]
      const g = grams(c)
      if (v == null || v === '' || g == null) continue
      const n = Number(v)
      if (!Number.isFinite(n)) continue
      sum += (n * g) / 100
      seen = true
    }
    raw[col] = seen ? sum : null
  }

  const mainGrams = grams(list[0])
  const totals = {}
  const per100 = {}
  for (const col of NUTRIENT_COLS) {
    totals[col] = raw[col] == null ? null : roundCol(col, raw[col])
    per100[col] = raw[col] == null || mainGrams == null
      ? null
      : roundCol(col, (raw[col] * 100) / mainGrams)
  }
  return { totals, per100, mainGrams }
}

// Alimenti personali che contengono il testo cercato. Stesso criterio della
// ricerca sul catalogo (sottostringa, senza distinzione di maiuscole), con i
// nomi che INIZIANO col testo davanti agli altri.
export function searchCustomFoods(list, query) {
  const q = String(query ?? '').trim().toLowerCase()
  if (q.length < 2) return []
  return (list || [])
    .filter(f => String(f.name).toLowerCase().includes(q))
    .sort((a, b) => {
      const ap = String(a.name).toLowerCase().startsWith(q)
      const bp = String(b.name).toLowerCase().startsWith(q)
      if (ap !== bp) return ap ? -1 : 1
      return String(a.name).localeCompare(String(b.name))
    })
}

// Unisce i propri alimenti ai risultati del catalogo mettendoli SUBITO DOPO il
// primo: cercando "bistecca" si vede prima "Bistecca" (la voce generica, il
// significato più ovvio) e poi "Bistecca Simone", davanti a tutto il resto.
// Sono pochi e sono tuoi: vanno trovati subito, ma non devono coprire la voce
// che l'utente si aspetta in cima. Senza risultati dal catalogo restano soli.
export function mergeCustomFoods(remote, mine) {
  const list = remote || []
  if (!mine?.length) return list
  if (!list.length) return mine
  return [list[0], ...mine, ...list.slice(1)]
}

export { newId as newCustomFoodId } from './ids'
