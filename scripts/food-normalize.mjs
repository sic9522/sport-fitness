// Normalizzatori dei prodotti alimentari (Open Food Facts / FoodData Central) verso lo
// schema unificato public.food_items. Funzioni PURE, senza dipendenze e testabili
// (scripts/food-normalize.test.mjs): le usa l'import in blocco (scripts/import-foods.mjs).
// Tutti i valori nutrizionali sono per 100 g.

// Paesi europei (slug come nei countries_tags OFF, senza il prefisso "en:").
const EU_COUNTRIES = new Set([
  'austria', 'belgium', 'bulgaria', 'croatia', 'cyprus', 'czech-republic', 'czechia',
  'denmark', 'estonia', 'finland', 'france', 'germany', 'greece', 'hungary', 'ireland',
  'italy', 'latvia', 'lithuania', 'luxembourg', 'malta', 'netherlands', 'poland',
  'portugal', 'romania', 'slovakia', 'slovenia', 'spain', 'sweden',
  'united-kingdom', 'switzerland', 'norway', 'iceland',
])

const REGION_BY_COUNTRY = { china: 'cn', 'united-states': 'us' }

// "en:italy" → "italy" (toglie il prefisso lingua a due lettere).
function countrySlug(tag) {
  return String(tag || '').replace(/^[a-z]{2}:/i, '').toLowerCase()
}

// countries_tags OFF → regioni di mercato ('eu' | 'us' | 'cn'). Un prodotto può ricadere
// in più regioni; ordine stabile (eu, us, cn) per confronti deterministici.
export function regionsFromCountryTags(tags) {
  const found = new Set()
  for (const tag of tags || []) {
    const c = countrySlug(tag)
    if (c === 'europe' || c === 'european-union' || EU_COUNTRIES.has(c)) found.add('eu')
    else if (REGION_BY_COUNTRY[c]) found.add(REGION_BY_COUNTRY[c])
  }
  return ['eu', 'us', 'cn'].filter(r => found.has(r))
}

// Numero finito oppure null. MAI 0 per un dato mancante: la copertura OFF è incompleta
// (es. prodotti senza fibre) e uno 0 falso falserebbe i totali.
function num(v) {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// "Nutella, Ferrero" → "Nutella" (prima marca).
function firstBrand(brands) {
  if (!brands) return null
  return String(brands).split(',')[0].trim() || null
}

// 1 kcal = 4.184 kJ. In Europa l'energia è dichiarata per legge in kJ, e molti prodotti
// riportano SOLO quella: senza conversione li perderemmo tutti.
const KJ_PER_KCAL = 4.184

// Nutrienti per 100 g dal NUOVO schema del dump OFF:
//   nutrition.aggregated_set = { per: '100g', preparation: 'as_sold', nutrients: { id: { value } } }
// Si accetta solo `per: '100g'` (i set per porzione non sono confrontabili) e il prodotto
// "as_sold" quando indicato, non quello preparato.
function offNutritionSet(product) {
  const set = product.nutrition?.aggregated_set
  if (!set || set.per !== '100g') return null
  if (set.preparation && set.preparation !== 'as_sold') return null
  const nut = set.nutrients
  if (!nut || typeof nut !== 'object') return null
  const val = k => (nut[k] && nut[k].value != null ? nut[k].value : null)
  const kcal = val('energy-kcal')
  const kj = val('energy-kj')
  return {
    kcal: kcal != null ? kcal : (kj != null ? kj / KJ_PER_KCAL : null),
    protein: val('proteins'),
    carbs: val('carbohydrates'),
    fat: val('fat'),
    fiber: val('fiber'),
    sugar: val('sugars'),
    salt: val('salt'),
  }
}

// Nutrienti dal VECCHIO schema (campi piatti *_100g), usato dall'API e dai prodotti
// non ancora riesportati.
function offLegacyNutriments(product) {
  const n = product.nutriments
  if (!n || typeof n !== 'object') return null
  const kcal = n['energy-kcal_100g']
  const kj = n['energy-kj_100g']
  const values = {
    kcal: kcal != null ? kcal : (kj != null ? kj / KJ_PER_KCAL : null),
    protein: n.proteins_100g,
    carbs: n.carbohydrates_100g,
    fat: n.fat_100g,
    fiber: n.fiber_100g,
    sugar: n.sugars_100g,
    salt: n.salt_100g,
  }
  return Object.values(values).some(v => v != null) ? values : null
}

// Open Food Facts: oggetto prodotto (riga del dump o campo `product` dell'API) →
// riga food_items. Serve nome + barcode, altrimenti scarta (null).
// I nutrienti si leggono da ENTRAMBI gli schemi: nel dump attuale i prodotti europei
// hanno `nutriments` vuoto e i valori in `nutrition.aggregated_set`, quindi leggere solo
// il vecchio formato scarterebbe di fatto tutto il catalogo europeo.
export function normalizeOff(product) {
  if (!product) return null
  const code = product.code ? String(product.code) : null
  const name = (product.product_name || product.product_name_it || product.product_name_en || '').trim()
  if (!name || !code) return null
  const n = offLegacyNutriments(product) || offNutritionSet(product) || {}
  return {
    source: 'off',
    source_id: code,
    barcode: code,
    name,
    brand: firstBrand(product.brands),
    serving_size: num(product.serving_quantity),
    serving_unit: product.serving_quantity != null ? 'g' : null,
    calories_kcal: num(n.kcal) != null ? Math.round(num(n.kcal) * 10) / 10 : null,
    protein_g: num(n.protein),
    carbs_g: num(n.carbs),
    fat_g: num(n.fat),
    fiber_g: num(n.fiber),
    sugar_g: num(n.sugar),
    salt_g: num(n.salt),
    regions: regionsFromCountryTags(product.countries_tags),
  }
}

// FoodData Central: legge sia la forma API (foodNutrients[].nutrientId / .value) sia
// quella del dump (foodNutrients[].nutrient.id / .amount). Valori per 100 g.
function fdcNutrientMap(food) {
  const map = new Map()
  for (const fn of food.foodNutrients || []) {
    const id = fn.nutrientId ?? fn.nutrient?.id
    const value = fn.value ?? fn.amount
    if (id != null && value != null) map.set(Number(id), Number(value))
  }
  return map
}

export function normalizeFdc(food) {
  if (!food) return null
  const id = food.fdcId
  const name = (food.description || '').trim()
  if (!id || !name) return null
  const m = fdcNutrientMap(food)
  const sodiumMg = m.get(1093)
  return {
    source: 'fdc',
    source_id: String(id),
    barcode: food.gtinUpc ? String(food.gtinUpc) : null,
    name,
    brand: food.brandName || food.brandOwner || null,
    serving_size: num(food.servingSize),
    serving_unit: food.servingSizeUnit || null,
    calories_kcal: num(m.get(1008)), // Energy (kcal)
    protein_g: num(m.get(1003)),
    carbs_g: num(m.get(1005)), // Carbohydrate, by difference
    fat_g: num(m.get(1004)), // Total lipid (fat)
    fiber_g: num(m.get(1079)),
    sugar_g: num(m.get(2000)), // Total Sugars
    salt_g: sodiumMg != null ? Number((sodiumMg * 2.5 / 1000).toFixed(3)) : null, // sodio(mg) → sale(g)
    regions: ['us'],
  }
}

// Filtro qualità: tiene solo gli alimenti con dati veri (kcal + i tre macro). Scarta i
// prodotti "solo titolo" senza informazioni nutrizionali, così il catalogo resta snello.
// Zuccheri/fibre restano opzionali (OFF spesso non li riporta).
export function hasNutrition(row) {
  return !!row
    && row.calories_kcal != null
    && row.protein_g != null
    && row.carbs_g != null
    && row.fat_g != null
}

// Limiti FISICI dei valori per 100 g. Non sono preferenze: 100 g di prodotto non possono
// contenere più di 100 g di nutrienti, e nemmeno più energia del grasso puro.
// Il tetto energetico NON è 900: i fattori di Atwater (9 kcal/g per i lipidi) sono
// arrotondati, e per i grassi puri FoodData Central riporta valori misurati leggermente
// sopra — olio di pesce, lardo e sego di manzo stanno tutti a 902 kcal/100 g. Con la
// soglia a 900 venivano scartati alimenti veri e corretti, quindi c'è un margine.
const MAX_KCAL_PER_100G = 920
const MAX_MACRO_SUM = 105 // 100 g + 5 g di tolleranza per gli arrotondamenti dichiarati

// Scarta i valori impossibili. Open Food Facts è collaborativo e una quota rilevante dei
// campi *_100g è sbagliata all'origine (valori per porzione finiti nel campo per 100 g,
// errori di unità): nel dump completo ~28% dei prodotti con dati nutrizionali ha una somma
// di macro >100 g/100 g e ~20% supera le 900 kcal. Esempi reali visti nel dump: un olio con
// 510 g di grassi e 4590 kcal per 100 g, cornflakes con 240 g di carboidrati.
// Importarli significherebbe mostrare numeri assurdi in un'app che serve a monitorare
// l'alimentazione, quindi vengono esclusi.
export function isPlausibleNutrition(row) {
  if (!row) return false
  const macros = [row.protein_g, row.carbs_g, row.fat_g]
  if (macros.some(v => v == null || v < 0 || v > 100)) return false
  if (row.calories_kcal == null || row.calories_kcal < 0 || row.calories_kcal > MAX_KCAL_PER_100G) return false
  if (macros.reduce((a, b) => a + b, 0) > MAX_MACRO_SUM) return false
  // Anche i nutrienti opzionali, quando ci sono, devono stare nei limiti.
  for (const v of [row.fiber_g, row.sugar_g, row.salt_g]) {
    if (v != null && (v < 0 || v > 100)) return false
  }
  return true
}
