// Attrezzi del catalogo esercizi: slug (colonna `equipment` di catalog_exercises,
// vocabolario in public.catalog_equipment) -> chiave i18n dell'etichetta.
//
// La tabella sul DB ha un `label_it` che serve alla RICERCA (sinonimi, refusi);
// l'etichetta MOSTRATA arriva invece da qui, perche' l'app parla 5 lingue.
// Vedi la migrazione 20260723140000_exercise_equipment_search.sql.
export const EQUIPMENT_SLUGS = [
  'barbell', 'ez-bar', 'dumbbell', 'kettlebell', 'cable',
  'machine', 'smith', 'band', 'bodyweight', 'trx',
]

// Slug sconosciuto (import futuri, dati vecchi) -> nessuna etichetta, non un
// testo rotto tipo "equipment.qualcosa".
export function equipmentLabelKey(slug) {
  return EQUIPMENT_SLUGS.includes(slug) ? `equipment.${slug}` : null
}
