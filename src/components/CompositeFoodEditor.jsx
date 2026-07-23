import { useState, Fragment } from 'react'
import { IoClose, IoAdd, IoTrashOutline, IoGitBranchOutline } from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'
import useScrollLock from '../hooks/useScrollLock'
import useModalGuard, { useDirty } from '../hooks/useModalGuard'
import { titleCase } from '../utils/text'
import { decimalInput } from '../utils/numberInput'
import { MACROS } from '../data/nutritionDefaults'
import {
  newCustomFoodId, CUSTOM_FOOD_SOURCE, compositeNutrients, MAX_COMPONENTS, isNameTaken,
  canAddVariant, MAX_VARIANTS,
} from '../data/customFoods'
import Field from './ui/Field'
import ModalActions from './ui/ModalActions'
import FoodSearchInput from './FoodSearchInput'

// Macro mostrato -> colonna del catalogo (le stesse coppie dell'alimento semplice).
const MACRO_COLS = {
  protein: 'protein_g', carbs: 'carbs_g', fat: 'fat_g',
  sugars: 'sugar_g', fiber: 'fiber_g',
}

// Riga vuota: `text` è quello che si sta digitando, `item` l'alimento scelto,
// `grams` quanti se ne usano. La chiave serve a React: non si può usare l'indice,
// perché togliendo una riga in mezzo le successive scalerebbero e i campi si
// porterebbero dietro il testo della riga sbagliata.
const emptyRow = key => ({ key, text: '', item: null, grams: '' })

// Righe di partenza: vuote per un composto nuovo, gli ingredienti già scelti
// quando si modifica o si parte da un originale per farne una variante.
function rowsFrom(initial) {
  const comps = initial?.components
  if (!comps?.length) return [emptyRow(1)]
  return comps.map((c, i) => ({ key: i + 1, text: c.name, item: c, grams: c.grams ?? '' }))
}

// Etichetta della riga: il primo è il principale (i suoi grammi sono il
// riferimento), il secondo il secondario, dal terzo in poi sono "altro".
function rowLabelKey(i) {
  if (i === 0) return 'products.mainIngredient'
  if (i === 1) return 'products.secondIngredient'
  return 'products.otherIngredient'
}

// Creazione di un alimento COMPOSTO: più alimenti del catalogo in una voce sola
// (la propria carbonara, il proprio frullato).
//
// Nessun valore nutrizionale si scrive a mano: si scelgono gli alimenti, si dice
// quanti grammi se ne usano, e kcal e macro si calcolano. Il PRIMO alimento è il
// principale: i suoi grammi sono il riferimento del "per 100 g" — vedi
// `compositeNutrients` in data/customFoods per il perché.
//
// `initial` = composto da modificare, oppure l'originale da cui parte una
// VARIANTE. Nel secondo caso (`asVariant`) gli ingredienti sono gli stessi ma il
// salvataggio crea una voce nuova: l'originale non si tocca.
// `existing` = composti già creati (varianti comprese), per non farne due uguali.
function CompositeFoodEditor({ initial = null, asVariant = false, existing = [], onSave, onCancel, onAddVariant }) {
  const { t } = useLang()
  useScrollLock()
  // Una variante nasce senza nome: è il nome a distinguerla dall'originale.
  const [name, setName] = useState(asVariant ? '' : (initial?.name ?? ''))
  const [rows, setRows] = useState(() => rowsFrom(initial))
  const [nextKey, setNextKey] = useState(() => rowsFrom(initial).length + 1)

  // Un ingrediente conta solo se ha sia l'alimento sia i grammi.
  const chosen = rows.filter(r => r.item).map(r => ({ ...r.item, grams: r.grams }))
  const { totals, per100, mainGrams } = compositeNutrients(chosen)
  // Senza i grammi del principale il "per 100 g" non esiste, e senza quello
  // l'alimento sarebbe inutilizzabile nel diario: meglio non farlo salvare.
  // Una variante è un composto anche lei: entra nello stesso insieme di nomi.
  const taken = isNameTaken(existing, {
    name,
    composite: true,
    excludeId: asVariant ? null : initial?.id,
  })
  const valid = name.trim() !== '' && chosen.length > 0 && mainGrams != null && !taken
  const canAdd = rows.length < MAX_COMPONENTS
  const dirty = useDirty({ name, rows })
  const guard = useModalGuard({ dirty, onSave: save, onCancel, onReset: reset })

  // Perché il tasto "Aggiungi variante" non è sempre premibile: una variante è
  // una differenza rispetto a QUALCOSA, quindi l'originale deve esistere già
  // (salvato) — altrimenti non si saprebbe da cosa differisce.
  const [variantMsg, setVariantMsg] = useState('')
  function requestVariant() {
    if (!initial) { setVariantMsg(t('products.variantNeedsOriginal')); return }
    if (dirty) { setVariantMsg(t('products.variantNeedsSave')); return }
    // Cinque al massimo: in "Aggiungi un pasto" diventano bottoni su una riga.
    if (!canAddVariant(initial)) { setVariantMsg(t('products.variantMax', { n: MAX_VARIANTS })); return }
    setVariantMsg('')
    onAddVariant(initial)
  }

  const patchRow = (key, patch) => setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)))

  function addRow() {
    if (!canAdd) return
    setRows(rs => [...rs, emptyRow(nextKey)])
    setNextKey(k => k + 1)
  }

  function removeRow(key) {
    // Mai zero righe: resterebbe una modale senza il campo che le dà senso.
    setRows(rs => (rs.length === 1 ? [emptyRow(nextKey)] : rs.filter(r => r.key !== key)))
    if (rows.length === 1) setNextKey(k => k + 1)
  }

  function reset() {
    setName('')
    setRows([emptyRow(nextKey)])
    setNextKey(k => k + 1)
  }

  function save() {
    if (!valid) return
    onSave({
      // Modifica = stessa voce, id invariato. Variante = voce nuova.
      id: initial && !asVariant ? initial.id : newCustomFoodId(),
      source: CUSTOM_FOOD_SOURCE,
      name: titleCase(name.trim()),
      brand: null,
      // Gli ingredienti si conservano: sono la spiegazione dei valori, e senza
      // di loro un composto non si distinguerebbe da un alimento scritto a mano.
      components: chosen.map(c => ({
        name: c.name,
        grams: c.grams,
        calories_kcal: c.calories_kcal ?? null,
        protein_g: c.protein_g ?? null,
        carbs_g: c.carbs_g ?? null,
        fat_g: c.fat_g ?? null,
        sugar_g: c.sugar_g ?? null,
        fiber_g: c.fiber_g ?? null,
      })),
      // Il piatto intero e il peso a cui è riferito: si conservano perché sono
      // ciò che l'utente ha scritto, e i valori qui sotto ne discendono.
      total_kcal: totals.calories_kcal,
      main_grams: mainGrams,
      // Le colonne standard restano PER 100 g (del principale), come per ogni
      // altro alimento: è ciò che permette al diario di riscalare senza sapere
      // che questo è un composto.
      ...per100,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--surface)] border border-[color:var(--border-2)] p-5">
        <button
          onClick={guard.requestClose}
          aria-label={t('common.cancel')}
          className="absolute top-3 right-3 text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors"
        >
          <IoClose className="text-2xl" />
        </button>

        <h3 className="text-sm font-bold uppercase tracking-wide text-[color:var(--text-dim)] mt-1 mb-4 pr-8">
          {asVariant ? t('products.createVariant') : t('products.createComposite')}
        </h3>

        {asVariant && (
          <p className="-mt-2 mb-3 text-xs text-[color:var(--text-muted)]">
            {t('products.variantOf', { name: initial?.name ?? '' })}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Field
            label={asVariant ? t('products.variantName') : t('products.compositeName')}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={asVariant ? t('products.variantNamePlaceholder') : t('products.compositeNamePlaceholder')}
            error={taken ? t('products.nameTakenComposite') : undefined}
          />

          {/* Un campo di ricerca per ingrediente, lo stesso di "Aggiungi un pasto",
              con sotto i grammi che se ne usano. Il primo è il PRINCIPALE: i suoi
              grammi sono il peso a cui si riferisce il "per 100 g". */}
          {rows.map((row, i) => (
            <div key={row.key} className="flex flex-col gap-2">
              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <FoodSearchInput
                    label={t(rowLabelKey(i))}
                    value={row.text}
                    onChange={v => patchRow(row.key, { text: v, item: null })}
                    onPick={item => patchRow(row.key, { text: item.name, item })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  aria-label={t('products.removeIngredient')}
                  className="mb-1 p-2.5 rounded-xl border border-[color:var(--border-2)] text-[color:var(--text-muted)] hover:text-[color:var(--text)] hover:bg-[var(--surface-3)] transition-colors"
                >
                  <IoTrashOutline />
                </button>
              </div>

              <div className="flex items-center gap-2 pr-12">
                <input
                  value={row.grams}
                  onChange={e => patchRow(row.key, { grams: decimalInput(e.target.value) })}
                  inputMode="decimal"
                  placeholder="0"
                  aria-label={t('nutrition.grams')}
                  className="w-24 bg-[var(--surface)] border border-[color:var(--border-2)] rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] placeholder:text-[color:var(--text-faint)]"
                />
                <span className="text-xs text-[color:var(--text-dim)]">{t('nutrition.grams')}</span>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={addRow}
              disabled={!canAdd}
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold border border-[color:var(--border-2)] text-[color:var(--text)] hover:bg-[var(--surface-3)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <IoAdd className="text-base" />
              {t('products.addIngredient')}
            </button>

            {/* Le varianti a loro volta non ne hanno: un livello solo, altrimenti
                l'accordion dell'elenco diventerebbe un albero. */}
            {onAddVariant && !asVariant && (
              <button
                type="button"
                onClick={requestVariant}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold border border-[color:var(--border-2)] text-[color:var(--text)] hover:bg-[var(--surface-3)] transition-colors"
              >
                <IoGitBranchOutline className="text-base" />
                {t('products.addVariant')}
              </button>
            )}

            <span className="ml-auto text-xs text-[color:var(--text-dim)] tabular-nums">
              {chosen.length}/{MAX_COMPONENTS}
            </span>
          </div>

          {variantMsg && <p className="-mt-1 text-xs text-[color:var(--accent)]">{variantMsg}</p>}

          {/* Valori calcolati: si mostrano, non si toccano. Due colonne perché
              rispondono a due domande diverse — quanto pesa il piatto intero, e
              quanto vale la porzione da 100 g dell'alimento principale. */}
          <div className="rounded-xl border border-[color:var(--border-2)] px-4 py-3">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-baseline">
              <span />
              <span className="text-[10px] uppercase tracking-wider text-[color:var(--text-dim)] text-right">
                {t('products.total')}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[color:var(--text-dim)] text-right">
                {t('products.per100g')}
              </span>

              <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)] mt-1">
                {t('nutrition.kcal')}
              </span>
              <span className="text-lg font-extrabold tabular-nums text-right mt-1" style={{ color: 'var(--accent)' }}>
                {totals.calories_kcal ?? '—'}
              </span>
              <span className="text-lg font-extrabold tabular-nums text-right mt-1" style={{ color: 'var(--accent)' }}>
                {per100.calories_kcal ?? '—'}
              </span>

              {MACROS.map(m => (
                <Fragment key={m.key}>
                  <span className="text-xs text-[color:var(--text-dim)]">{t(m.shortKey)}</span>
                  <span className="text-xs tabular-nums font-semibold text-right">{totals[MACRO_COLS[m.key]] ?? '—'}</span>
                  <span className="text-xs tabular-nums font-semibold text-right">{per100[MACRO_COLS[m.key]] ?? '—'}</span>
                </Fragment>
              ))}
            </div>

            <p className="mt-3 text-xs text-[color:var(--text-dim)]">
              {mainGrams
                ? t('products.compositeHowto', { grams: mainGrams })
                : t('products.compositeNeedsMainGrams')}
            </p>
          </div>
        </div>

        <ModalActions compact showReset guard={guard} canSave={valid && dirty} />
      </div>
    </div>
  )
}

export default CompositeFoodEditor
