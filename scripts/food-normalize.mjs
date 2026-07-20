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

// Open Food Facts: oggetto prodotto (riga del dump o campo `product` dell'API) →
// riga food_items. Usa i campi *_100g. Serve nome + barcode, altrimenti scarta (null).
export function normalizeOff(product) {
  if (!product) return null
  const code = product.code ? String(product.code) : null
  const name = (product.product_name || product.product_name_it || product.product_name_en || '').trim()
  if (!name || !code) return null
  const n = product.nutriments || {}
  return {
    source: 'off',
    source_id: code,
    barcode: code,
    name,
    brand: firstBrand(product.brands),
    serving_size: num(product.serving_quantity),
    serving_unit: product.serving_quantity != null ? 'g' : null,
    calories_kcal: num(n['energy-kcal_100g']),
    protein_g: num(n.proteins_100g),
    carbs_g: num(n.carbohydrates_100g),
    fat_g: num(n.fat_100g),
    fiber_g: num(n.fiber_100g),
    sugar_g: num(n.sugars_100g),
    salt_g: num(n.salt_100g),
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
