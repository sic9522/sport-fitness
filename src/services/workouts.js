import { supabase } from '../lib/supabaseClient'
import { isUuid } from '../data/ids'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

// Riusa l'id locale SOLO se e' un UUID valido. I dati creati prima della correzione di
// ids.js (o in contesto non sicuro) hanno id tipo "1753189200000": passarli a una colonna
// `uuid` farebbe fallire l'insert e perderebbe l'intera sincronizzazione. Omettendo il
// campo, Postgres ne genera uno lui; al primo pull il locale adotta gli id del database,
// quindi il disallineamento si sana da solo.
const withId = (row, id) => (isUuid(id) ? { ...row, id } : row)

// Recupero per-scheda: intero >= 0, altrimenti NULL (= non impostato).
const restToDb = v => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
}

function exerciseFromRow(row) {
  return {
    id: row.id,
    titolo: row.title,
    serie: row.sets,
    reps: row.reps,
    kg: row.weight_kg,
    foto: row.photo_url,
    stato: row.status === 'none' ? undefined : row.status,
    split: row.is_split || false,
    ...(row.is_split && Array.isArray(row.set_details) ? { sets: row.set_details } : {}),
  }
}

function cardFromRow(row) {
  return {
    id: row.id,
    nome: row.name,
    custom: row.is_custom,
    // NULL sul DB = recupero non impostato: il modello locale lo rappresenta con
    // l'assenza della chiave, cosi' la scheda ricade sul valore predefinito.
    ...(row.rest_seconds == null ? {} : { rest: row.rest_seconds }),
    esercizi: (row.exercises || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(exerciseFromRow),
  }
}

function dayFromRow(row) {
  return {
    id: row.id,
    nome: row.name,
    day: row.day_key,
    custom: row.is_custom,
    stato: row.status === 'none' ? undefined : row.status,
    schede: (row.workout_cards || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(cardFromRow),
  }
}

export async function fetchWorkoutDays() {
  const client = requireSupabase()
  const { data, error } = await client
    .from('workout_days')
    .select(`
      id,
      name,
      day_key,
      is_custom,
      status,
      sort_order,
      workout_cards (
        id,
        name,
        is_custom,
        rest_seconds,
        sort_order,
        exercises (
          id,
          title,
          sets,
          reps,
          weight_kg,
          photo_url,
          status,
          is_split,
          set_details,
          sort_order
        )
      )
    `)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data || []).map(dayFromRow)
}

export async function replaceWorkoutDays(userId, giornate) {
  const client = requireSupabase()

  const { error: deleteError } = await client
    .from('workout_days')
    .delete()
    .eq('user_id', userId)

  if (deleteError) throw deleteError

  for (const [dayIndex, giornata] of giornate.entries()) {
    const { data: dayRows, error: dayError } = await client
      .from('workout_days')
      .insert(withId({
        user_id: userId,
        name: giornata.nome || null,
        day_key: giornata.day || null,
        is_custom: Boolean(giornata.custom),
        status: giornata.stato || 'none',
        sort_order: dayIndex,
      }, giornata.id))
      .select('id')
      .single()

    if (dayError) throw dayError

    for (const [cardIndex, scheda] of (giornata.schede || []).entries()) {
      const { data: cardRows, error: cardError } = await client
        .from('workout_cards')
        .insert(withId({
          workout_day_id: dayRows.id,
          name: scheda.nome || '',
          is_custom: Boolean(scheda.custom),
          rest_seconds: restToDb(scheda.rest),
          sort_order: cardIndex,
        }, scheda.id))
        .select('id')
        .single()

      if (cardError) throw cardError

      const exercises = (scheda.esercizi || []).map((exercise, exerciseIndex) => withId({
        workout_card_id: cardRows.id,
        title: exercise.titolo,
        sets: String(exercise.serie),
        reps: String(exercise.reps),
        weight_kg: String(exercise.kg),
        photo_url: exercise.foto || null,
        status: exercise.stato || 'none',
        is_split: Boolean(exercise.split),
        set_details: exercise.split ? (exercise.sets || null) : null,
        sort_order: exerciseIndex,
      }, exercise.id))

      if (exercises.length) {
        const { error: exerciseError } = await client
          .from('exercises')
          .insert(exercises)

        if (exerciseError) throw exerciseError
      }
    }
  }
}
