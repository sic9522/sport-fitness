import { useState } from 'react'
import { IoClose, IoChevronDown } from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'
import useScrollLock from '../hooks/useScrollLock'
import useModalGuard, { useDirty } from '../hooks/useModalGuard'
import { titleCase } from '../utils/text'
import { onlyDigits, decimalInput } from '../utils/numberInput'
import { MACROS } from '../data/nutritionDefaults'
import { newCustomFoodId, CUSTOM_FOOD_SOURCE, isNameTaken } from '../data/customFoods'
import Field from './ui/Field'
import ModalActions from './ui/ModalActions'

// Campi della form ↔ colonne del catalogo. L'alimento personale nasce con la
// stessa forma di una riga di food_items (vedi data/customFoods), così da lì in
// poi è indistinguibile da un prodotto vero per il resto dell'app.
const MACRO_COLS = {
  protein: 'protein_g', carbs: 'carbs_g', fat: 'fat_g',
  sugars: 'sugar_g', fiber: 'fiber_g',
}

const EMPTY = { name: '', kcal: '', protein: '', carbs: '', fat: '', sugars: '', fiber: '' }

// Da voce salvata a campi della form (null = campo vuoto, non "0").
const str = v => (v == null ? '' : String(v))
function formFrom(food) {
  return {
    name: food.name ?? '',
    kcal: str(food.calories_kcal),
    ...Object.fromEntries(Object.entries(MACRO_COLS).map(([k, col]) => [k, str(food[col])])),
  }
}

// Creazione di un alimento personale. Stessa veste delle altre modali.
//
// I valori sono SEMPRE per 100 g e la quantità non si tocca: è la base comune a
// tutto il catalogo, ed è ciò che permette poi di pesare 130 g nel diario e
// vedere i numeri riscalati. Per questo accanto alle kcal c'è "/100 g" fisso e
// non un campo grammi.
// `initial` = alimento da modificare (doppio click sull'elenco); assente = nuovo.
// `existing` = alimenti personali già creati, per non farne due con lo stesso nome.
function CustomFoodEditor({ initial = null, existing = [], onSave, onCancel }) {
  const { t } = useLang()
  useScrollLock()
  const [form, setForm] = useState(() => (initial ? formFrom(initial) : EMPTY))
  const [open, setOpen] = useState(false) // accordion macro-nutrienti

  const set = patch => setForm(f => ({ ...f, ...patch }))
  const taken = isNameTaken(existing, { name: form.name, composite: false, excludeId: initial?.id })
  const valid = form.name.trim() !== '' && form.kcal !== '' && !taken
  const dirty = useDirty(form)
  const guard = useModalGuard({ dirty, onSave: save, onCancel, onReset: reset })

  function reset() {
    setForm(EMPTY)
    setOpen(false)
  }

  function save() {
    if (!valid) return
    // Vuoto = nutriente NON DICHIARATO, quindi null e non 0: sommarlo come zero
    // farebbe sembrare completo un alimento di cui non sappiamo i macro.
    const num = v => (v === '' ? null : Number(v))
    onSave({
      ...initial, // in modifica conserva quello che la form non tocca
      id: initial?.id ?? newCustomFoodId(),
      source: CUSTOM_FOOD_SOURCE,
      name: titleCase(form.name.trim()),
      brand: null,
      calories_kcal: Number(form.kcal),
      ...Object.fromEntries(Object.entries(MACRO_COLS).map(([k, col]) => [col, num(form[k])])),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[color:var(--border-2)] p-5">
        <button
          onClick={guard.requestClose}
          aria-label={t('common.cancel')}
          className="absolute top-3 right-3 text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors"
        >
          <IoClose className="text-2xl" />
        </button>

        <h3 className="text-sm font-bold uppercase tracking-wide text-[color:var(--text-dim)] mt-1 mb-4 pr-8">
          {initial ? t('products.editFood') : t('products.createFood')}
        </h3>

        <div className="flex flex-col gap-3">
          <Field
            label={t('products.foodName')}
            value={form.name}
            onChange={e => set({ name: e.target.value })}
            placeholder={t('products.foodNamePlaceholder')}
            error={taken ? t('products.nameTakenFood') : undefined}
          />

          {/* "/100 g" è un'etichetta, non un campo: la quantità è fissa per
              costruzione e lasciarla modificabile suggerirebbe il contrario. */}
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">
              {t('nutrition.kcal')}
            </span>
            <div className="relative">
              <input
                value={form.kcal}
                onChange={e => set({ kcal: onlyDigits(e.target.value) })}
                inputMode="numeric"
                placeholder="0"
                className="w-full bg-[var(--surface)] border border-[color:var(--border-2)] rounded-xl px-4 py-3 pr-20 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] placeholder:text-[color:var(--text-faint)]"
                style={{ color: 'var(--accent)', fontWeight: 700 }}
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-[color:var(--text-dim)]">
                {t('products.per100g')}
              </span>
            </div>
          </label>

          <div className="rounded-xl border border-[color:var(--border-2)] overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              aria-expanded={open}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-[var(--surface-3)] transition-colors"
            >
              {t('nutrition.macros')}
              <IoChevronDown className={`text-[color:var(--text-dim)] transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
              <div className="px-4 pb-4 pt-1 flex flex-col gap-3 border-t border-[color:var(--border-1)]">
                <div className="grid grid-cols-2 gap-2">
                  {MACROS.map(m => (
                    <Field
                      key={m.key}
                      label={t(m.shortKey)}
                      value={form[m.key]}
                      onChange={e => set({ [m.key]: decimalInput(e.target.value) })}
                      inputMode="decimal"
                      placeholder="0"
                    />
                  ))}
                </div>
                <p className="text-xs text-[color:var(--text-dim)]">{t('products.macrosPer100g')}</p>
              </div>
            )}
          </div>
        </div>

        <ModalActions compact showReset guard={guard} canSave={valid && dirty} />
      </div>
    </div>
  )
}

export default CustomFoodEditor
