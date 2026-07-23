import { MACROS } from './nutritionDefaults'

// Macro mostrato -> colonna del catalogo (le stesse coppie degli editor).
const MACRO_COL = {
  protein: 'protein_g', carbs: 'carbs_g', fat: 'fat_g',
  sugars: 'sugar_g', fiber: 'fiber_g',
}

// Criteri di ordinamento della pagina Prodotti: il nome (l'ordine di sempre) più
// kcal e i cinque macro. `col` è la colonna vera, così lo stesso elenco vale sia
// per l'ordinamento sul database sia per quello in memoria.
export const SORT_FIELDS = [
  { key: 'name', col: 'name', labelKey: 'products.sortName' },
  { key: 'kcal', col: 'calories_kcal', labelKey: 'nutrition.kcal' },
  ...MACROS.map(m => ({ key: m.key, col: MACRO_COL[m.key], labelKey: m.shortKey })),
]

export const sortFieldByKey = key => SORT_FIELDS.find(f => f.key === key) ?? SORT_FIELDS[0]

// Ordina una lista già in memoria (lista personalizzata e risultati di ricerca).
//
// I valori mancanti finiscono SEMPRE in fondo, in entrambi i versi: "non
// dichiarato" non è "zero", e un alimento di cui non sappiamo le fibre non deve
// vincere la classifica delle fibre solo perché il campo è vuoto.
export function sortFoods(list, col, ascending = true) {
  const dir = ascending ? 1 : -1
  const val = f => {
    const v = f?.[col]
    if (v == null || v === '') return null
    return col === 'name' ? String(v).toLowerCase() : Number(v)
  }

  return [...(list || [])].sort((a, b) => {
    const x = val(a)
    const y = val(b)
    if (x === null && y === null) return 0
    if (x === null) return 1
    if (y === null) return -1
    if (typeof x === 'number' && Number.isNaN(x)) return 1
    if (typeof y === 'number' && Number.isNaN(y)) return -1
    if (x < y) return -dir
    if (x > y) return dir
    // A parità, il nome: due alimenti con le stesse kcal non devono scambiarsi
    // di posto a ogni render.
    return String(a?.name ?? '').localeCompare(String(b?.name ?? ''))
  })
}
