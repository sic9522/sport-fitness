// Indicizzazione alfabetica dei prodotti (pagina Prodotti).
//
// L'iniziale di raggruppamento: le accentate valgono la lettera base ("Ærø" → A,
// "Èspresso" → E), tutto il resto (cifre, punteggiatura, simboli, alfabeti non
// latini) finisce sotto '#', il gruppo che la pagina mostra in FONDO.
export const OTHER_INITIAL = '#'

// U+0300-U+036F = segni diacritici separati dalla normalizzazione NFD.
const DIACRITICS = /[̀-ͯ]/g

export function foodInitial(name) {
  const first = String(name ?? '').trim().normalize('NFD').replace(DIACRITICS, '')[0]
  if (!first) return OTHER_INITIAL
  const up = first.toUpperCase()
  return up >= 'A' && up <= 'Z' ? up : OTHER_INITIAL
}

// Spezza una lista già ordinata in gruppi { initial, items } consecutivi.
// Non riordina nulla: l'ordine arriva dal database, qui si mettono solo le
// intestazioni di lettera dove l'iniziale cambia.
export function groupByInitial(items) {
  const groups = []
  for (const item of items) {
    const initial = foodInitial(item.name)
    const last = groups[groups.length - 1]
    if (last && last.initial === initial) last.items.push(item)
    else groups.push({ initial, items: [item] })
  }
  return groups
}
