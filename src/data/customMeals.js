// Pasti personalizzati: combinazioni salvate dall'utente (es. "Colazione tipo")
// da riusare nel diario senza reinserire ogni volta gli stessi valori.
//
// Si creano in Prodotti → Personali (`CustomMealEditor`) e si richiamano dalla
// select nella modale "Aggiungi un pasto" (`FoodEditor`), dove la prima voce
// "Nessuno" (i18n `nutrition.noCustomMeal`) vale "nessuno scelto".
//
// Forma di una voce, volutamente identica a quella di un alimento del diario
// (vedi nutritionDefaults) piu' due campi propri: { id, nome, meal, alimento,
// grammi, kcal, protein, carbs, fat, sugars, fiber } con i valori numerici come
// stringhe. `nome` = come l'ha chiamato l'utente, `meal` = pasto della giornata,
// `alimento` = prodotto da cui arrivano i valori. Cosi' sceglierne uno significa
// solo copiarne i campi nella form, senza conversioni.
const KEY = 'fitpulse-pasti-personalizzati'

// Valore della prima voce della select ("Nessuno"): stringa vuota, cosi' il
// controllo resta controllato senza dover distinguere null da undefined.
export const NO_CUSTOM_MEAL = ''

export function loadCustomMeals() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (Array.isArray(saved)) return saved
  } catch {
    // dato corrotto → nessun pasto personalizzato
  }
  return []
}

export function saveCustomMeals(list) {
  localStorage.setItem(KEY, JSON.stringify(list || []))
}

export function findCustomMeal(list, id) {
  return (list || []).find(m => m.id === id) || null
}

// Inserisce o sostituisce (per id) e riordina per nome: l'elenco e la select
// restano leggibili senza che il chiamante ci pensi.
export function upsertCustomMeal(list, meal) {
  const others = (list || []).filter(m => m.id !== meal.id)
  return [...others, meal].sort((a, b) => String(a.nome).localeCompare(String(b.nome)))
}

export { newId as newCustomMealId } from './ids'
