import { describe, it, expect } from 'vitest'
import {
  regionsFromCountryTags, normalizeOff, normalizeFdc, hasNutrition, isPlausibleNutrition,
} from './food-normalize.mjs'

// Fixture ricavate da payload REALI delle due API (verificati via fetch).

// Open Food Facts — Nutella (senza fibre nel payload → deve restare null, non 0).
const OFF_NUTELLA = {
  code: '3017620422003',
  product_name: 'Nutella',
  brands: 'Nutella, Ferrero, Yum yum',
  countries_tags: ['en:france'],
  nutriments: {
    'energy-kcal_100g': 539,
    proteins_100g: 6.3,
    carbohydrates_100g: 57.5,
    fat_100g: 30.9,
    sugars_100g: 56.3,
    salt_100g: 0.107,
    // niente fiber_100g
  },
}

// FoodData Central — forma API (nutrientId / value).
const FDC_CHEDDAR_API = {
  fdcId: 2057648,
  description: 'CHEDDAR CHEESE',
  dataType: 'Branded',
  gtinUpc: '094395000172',
  brandName: 'GRAFTON VILLAGE',
  foodCategory: 'Cheese',
  servingSize: 28,
  servingSizeUnit: 'g',
  foodNutrients: [
    { nutrientId: 1003, value: 21.4 },
    { nutrientId: 1004, value: 28.6 },
    { nutrientId: 1005, value: 3.57 },
    { nutrientId: 1008, value: 393 },
    { nutrientId: 2000, value: 0.0 },
    { nutrientId: 1079, value: 0.0 },
    { nutrientId: 1093, value: 679 },
  ],
}

// FoodData Central — forma dump (nutrient.id / amount).
const FDC_DUMP_SHAPE = {
  fdcId: 12345,
  description: 'BANANA, RAW',
  dataType: 'Foundation',
  foodNutrients: [
    { nutrient: { id: 1008 }, amount: 89 },
    { nutrient: { id: 1003 }, amount: 1.1 },
  ],
}

describe('regionsFromCountryTags', () => {
  it('mappa i paesi europei su eu', () => {
    expect(regionsFromCountryTags(['en:france'])).toEqual(['eu'])
    expect(regionsFromCountryTags(['en:italy', 'en:spain'])).toEqual(['eu'])
  })

  it('mappa cina e usa', () => {
    expect(regionsFromCountryTags(['en:china'])).toEqual(['cn'])
    expect(regionsFromCountryTags(['en:united-states'])).toEqual(['us'])
  })

  it('più mercati → più regioni, in ordine stabile eu,us,cn', () => {
    expect(regionsFromCountryTags(['en:united-states', 'en:france', 'en:china']))
      .toEqual(['eu', 'us', 'cn'])
  })

  it('ignora paesi non mappati e input vuoto', () => {
    expect(regionsFromCountryTags(['en:brazil'])).toEqual([])
    expect(regionsFromCountryTags(null)).toEqual([])
  })
})

describe('normalizeOff', () => {
  it('mappa i macro per 100 g e la regione dai countries_tags', () => {
    const row = normalizeOff(OFF_NUTELLA)
    expect(row).toMatchObject({
      source: 'off',
      source_id: '3017620422003',
      barcode: '3017620422003',
      name: 'Nutella',
      brand: 'Nutella',
      calories_kcal: 539,
      protein_g: 6.3,
      carbs_g: 57.5,
      fat_g: 30.9,
      sugar_g: 56.3,
      salt_g: 0.107,
      regions: ['eu'],
    })
  })

  it('un nutriente mancante resta null (non 0)', () => {
    expect(normalizeOff(OFF_NUTELLA).fiber_g).toBeNull()
  })

  it('scarta i prodotti senza nome o senza barcode', () => {
    expect(normalizeOff({ code: '1', product_name: '' })).toBeNull()
    expect(normalizeOff({ product_name: 'X', nutriments: {} })).toBeNull()
  })
})

describe('normalizeFdc', () => {
  it('estrae i nutrienti dalla forma API e calcola il sale dal sodio', () => {
    const row = normalizeFdc(FDC_CHEDDAR_API)
    expect(row).toMatchObject({
      source: 'fdc',
      source_id: '2057648',
      barcode: '094395000172',
      name: 'CHEDDAR CHEESE',
      brand: 'GRAFTON VILLAGE',
      calories_kcal: 393,
      protein_g: 21.4,
      carbs_g: 3.57,
      fat_g: 28.6,
      regions: ['us'],
    })
    // sodio 679 mg → sale 679 * 2.5 / 1000 = 1.698 g
    expect(row.salt_g).toBeCloseTo(1.698, 3)
    // 0.0 misurato resta 0 (diverso da mancante → null)
    expect(row.fiber_g).toBe(0)
    expect(row.sugar_g).toBe(0)
  })

  it('legge anche la forma del dump (nutrient.id / amount)', () => {
    const row = normalizeFdc(FDC_DUMP_SHAPE)
    expect(row.calories_kcal).toBe(89)
    expect(row.protein_g).toBe(1.1)
    expect(row.barcode).toBeNull()
    expect(row.regions).toEqual(['us'])
  })
})

describe('hasNutrition', () => {
  it('tiene gli alimenti con kcal e i tre macro', () => {
    expect(hasNutrition(normalizeOff(OFF_NUTELLA))).toBe(true)
  })

  it('scarta chi non ha kcal o un macro mancante', () => {
    // FDC_DUMP_SHAPE ha solo kcal e proteine → niente carbs/grassi → scartato
    expect(hasNutrition(normalizeFdc(FDC_DUMP_SHAPE))).toBe(false)
    // prodotto "solo titolo"
    const titleOnly = normalizeOff({ code: '1', product_name: 'Acqua', nutriments: {} })
    expect(hasNutrition(titleOnly)).toBe(false)
    expect(hasNutrition(null)).toBe(false)
  })
})

// I casi "impossibili" qui sotto sono presi DAL DUMP REALE di Open Food Facts:
// la fonte è collaborativa e una quota rilevante dei campi *_100g è errata.
describe('isPlausibleNutrition', () => {
  const base = { calories_kcal: 300, protein_g: 10, carbs_g: 40, fat_g: 10 }

  it('accetta valori nutrizionali normali', () => {
    expect(isPlausibleNutrition(base)).toBe(true)
    expect(isPlausibleNutrition(normalizeOff(OFF_NUTELLA))).toBe(true)
  })

  it('scarta più energia del grasso puro (olio reale: 4590 kcal/100 g)', () => {
    expect(isPlausibleNutrition({ ...base, calories_kcal: 4590, fat_g: 100 })).toBe(false)
    expect(isPlausibleNutrition({ ...base, calories_kcal: 901 })).toBe(false)
    expect(isPlausibleNutrition({ ...base, calories_kcal: 900 })).toBe(true) // limite ammesso
  })

  it('scarta un singolo macro oltre i 100 g su 100 g (olio reale: 510 g di grassi)', () => {
    expect(isPlausibleNutrition({ ...base, fat_g: 510 })).toBe(false)
    expect(isPlausibleNutrition({ ...base, carbs_g: 240 })).toBe(false)
  })

  it('scarta una somma di macro impossibile (tè reale: 66.67 P + 60 C)', () => {
    expect(isPlausibleNutrition({ calories_kcal: 267, protein_g: 66.67, carbs_g: 60, fat_g: 0 })).toBe(false)
  })

  it('tollera 5 g di scarto per gli arrotondamenti dichiarati', () => {
    expect(isPlausibleNutrition({ ...base, protein_g: 5, carbs_g: 50, fat_g: 50 })).toBe(true) // 105
    expect(isPlausibleNutrition({ ...base, protein_g: 6, carbs_g: 50, fat_g: 50 })).toBe(false) // 106
  })

  it('scarta i valori negativi', () => {
    expect(isPlausibleNutrition({ ...base, protein_g: -1 })).toBe(false)
    expect(isPlausibleNutrition({ ...base, calories_kcal: -10 })).toBe(false)
  })

  it('controlla anche i nutrienti opzionali, quando presenti', () => {
    expect(isPlausibleNutrition({ ...base, fiber_g: 500 })).toBe(false)
    expect(isPlausibleNutrition({ ...base, fiber_g: null })).toBe(true) // assente = ok
  })

  it('scarta righe nulle o senza macro', () => {
    expect(isPlausibleNutrition(null)).toBe(false)
    expect(isPlausibleNutrition({ calories_kcal: 100 })).toBe(false)
  })
})

// Nuovo schema del dump OFF (fixture ridotta dal prodotto REALE "Croissants Hazelnut",
// countries_tags con en:italy). I prodotti europei hanno `nutriments` VUOTO e i valori
// qui dentro: leggere solo il vecchio formato scartava tutto il catalogo europeo.
const OFF_NEW_SCHEMA = {
  code: '3608580827771',
  product_name: 'Croissants Hazelnut',
  brands: 'Bridor',
  countries_tags: ['en:france', 'en:italy'],
  nutriments: {}, // vuoto, come nel dump reale
  nutrition: {
    aggregated_set: {
      per: '100g',
      preparation: 'as_sold',
      nutrients: {
        'energy-kcal': { value: 478, unit: 'kcal' },
        'energy-kj': { value: 1993.4, unit: 'kJ' },
        fat: { value: 28.5, unit: 'g' },
        carbohydrates: { value: 46.9, unit: 'g' },
        proteins: { value: 7.2, unit: 'g' },
        salt: { value: 0.47, unit: 'g' },
        fiber: { value: 2.4, unit: 'g' },
      },
    },
  },
}

describe('normalizeOff — nuovo schema nutrition.aggregated_set', () => {
  it('legge i nutrienti quando `nutriments` è vuoto', () => {
    const row = normalizeOff(OFF_NEW_SCHEMA)
    expect(row).toMatchObject({
      name: 'Croissants Hazelnut',
      calories_kcal: 478,
      protein_g: 7.2,
      carbs_g: 46.9,
      fat_g: 28.5,
      fiber_g: 2.4,
      salt_g: 0.47,
      regions: ['eu'],
    })
    expect(hasNutrition(row)).toBe(true)
    expect(isPlausibleNutrition(row)).toBe(true)
  })

  it('il vecchio schema ha la precedenza quando è popolato', () => {
    const mixed = { ...OFF_NEW_SCHEMA, nutriments: { 'energy-kcal_100g': 100, proteins_100g: 1, carbohydrates_100g: 2, fat_100g: 3 } }
    expect(normalizeOff(mixed).calories_kcal).toBe(100)
  })

  it('deriva le kcal dai kJ quando mancano (etichette europee)', () => {
    const kjOnly = structuredClone(OFF_NEW_SCHEMA)
    delete kjOnly.nutrition.aggregated_set.nutrients['energy-kcal']
    // 1993.4 kJ / 4.184 = 476.4 kcal
    expect(normalizeOff(kjOnly).calories_kcal).toBeCloseTo(476.4, 1)
  })

  it('ignora i set NON per 100 g (valori per porzione, non confrontabili)', () => {
    const perServing = structuredClone(OFF_NEW_SCHEMA)
    perServing.nutrition.aggregated_set.per = 'serving'
    expect(normalizeOff(perServing).calories_kcal).toBeNull()
  })

  it('ignora il set del prodotto preparato, non venduto', () => {
    const prepared = structuredClone(OFF_NEW_SCHEMA)
    prepared.nutrition.aggregated_set.preparation = 'prepared'
    expect(normalizeOff(prepared).calories_kcal).toBeNull()
  })
})
