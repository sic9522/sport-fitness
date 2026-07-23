import { useState } from 'react'
import { IoClose, IoChevronDown } from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'
import useScrollLock from '../hooks/useScrollLock'
import useModalGuard, { useDirty } from '../hooks/useModalGuard'
import { titleCase } from '../utils/text'
import { onlyDigits, decimalInput } from '../utils/numberInput'
import { MEALS, MACROS, MACRO_KEYS, baseFromFoodItem, scaleNutrients } from '../data/nutritionDefaults'
import { newCustomMealId } from '../data/customMeals'
import { SELECT_CLS } from './FoodEditor'
import Field from './ui/Field'
import ModalActions from './ui/ModalActions'
import FoodSearchInput from './FoodSearchInput'

const EMPTY = {
  nome: '',     // nome del pasto personalizzato (quello che comparirà nella select)
  alimento: '', // prodotto da cui arrivano i valori (campo di ricerca)
  grammi: '',
  kcal: '',
  ...Object.fromEntries(MACRO_KEYS.map(k => [k, ''])),
}

// Creazione di un pasto personalizzato. Stessa veste della modale "Aggiungi un pasto".
//
// I valori seguono la stessa regola dell'editor alimenti: finché arrivano da un
// prodotto del catalogo (`base` = valori/100 g) cambiare i grammi li riscala tutti;
// appena l'utente scrive a mano un qualsiasi valore `base` va a null e da lì in poi
// non si ricalcola più nulla — quello che ha scritto è la verità.
// `initial` = pasto da modificare (doppio click sull'elenco); assente = nuovo.
function CustomMealEditor({ initial = null, onSave, onCancel }) {
  const { t } = useLang()
  useScrollLock()
  const [form, setForm] = useState(() => (initial ? { ...EMPTY, ...initial } : EMPTY))
  const [meal, setMeal] = useState(initial?.meal ?? MEALS[0].key)
  const [base, setBase] = useState(null) // valori/100 g del prodotto scelto (null = manuale)
  const [open, setOpen] = useState(false) // accordion macro-nutrienti

  const set = patch => setForm(f => ({ ...f, ...patch }))
  const valid = form.nome.trim() !== ''
  const dirty = useDirty({ form, meal })
  const guard = useModalGuard({ dirty, onSave: save, onCancel, onReset: reset })

  // Prodotto scelto dal catalogo: valori per 100 g, come li dà il catalogo.
  function pickFood(item) {
    const b = baseFromFoodItem(item)
    setBase(b)
    set({ alimento: item.name, grammi: '100', ...scaleNutrients(b, '100') })
    setOpen(true) // i valori appena arrivati sono il punto: si mostrano subito
  }

  function onAlimento(v) {
    set({ alimento: v })
    setBase(null)
  }

  function onGrammi(v) {
    const g = decimalInput(v)
    set({ grammi: g })
    if (base) set(scaleNutrients(base, g))
  }

  // Qualsiasi ritocco a mano sgancia dal prodotto: niente più ricalcolo automatico.
  // La virgola diventa punto: su tastiera italiana è il tasto decimale, e
  // lasciandola passare `Number('1,5')` sarebbe NaN.
  function onValue(key, v) {
    set({ [key]: key === 'kcal' ? onlyDigits(v) : decimalInput(v) })
    setBase(null)
  }

  function reset() {
    setForm(EMPTY)
    setMeal(MEALS[0].key)
    setBase(null)
    setOpen(false)
  }

  function save() {
    if (!valid) return
    onSave({
      id: initial?.id ?? newCustomMealId(),
      meal,
      ...form,
      nome: titleCase(form.nome.trim()),
      alimento: form.alimento.trim(),
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
          {initial ? t('products.editCustom') : t('products.createCustom')}
        </h3>

        <div className="flex flex-col gap-3">
          {/* Prima riga: come si chiamerà il pasto + a quale pasto della giornata appartiene. */}
          <div className="grid grid-cols-2 gap-2">
            <Field
              label={t('products.customName')}
              value={form.nome}
              onChange={e => set({ nome: e.target.value })}
              placeholder={t('products.customNamePlaceholder')}
              className="min-w-0"
            />
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">{t('nutrition.meal')}</span>
              <select value={meal} onChange={e => setMeal(e.target.value)} className={SELECT_CLS}>
                {MEALS.map(m => (
                  <option key={m.key} value={m.key}>{t(m.labelKey)}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Seconda riga: lo stesso campo Nome/ricerca della modale "Aggiungi un pasto". */}
          <FoodSearchInput value={form.alimento} onChange={onAlimento} onPick={pickFood} />

          {/* Terza riga: accordion coi valori. Chiuso di default perché il caso normale
              è scegliere un prodotto e fidarsi; aperto per correggerli a mano. */}
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
                  <Field
                    label={t('nutrition.grams')}
                    value={form.grammi}
                    onChange={e => onGrammi(e.target.value)}
                    inputMode="numeric"
                    placeholder="100"
                  />
                  {/* Le kcal restano il dato in evidenza, come nell'editor alimenti. */}
                  <Field
                    label={t('nutrition.kcal')}
                    value={form.kcal}
                    onChange={e => onValue('kcal', e.target.value)}
                    inputMode="numeric"
                    placeholder="0"
                    style={{ color: 'var(--accent)', fontWeight: 700 }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {MACROS.map(m => (
                    <Field
                      key={m.key}
                      label={t(m.shortKey)}
                      value={form[m.key]}
                      onChange={e => onValue(m.key, e.target.value)}
                      inputMode="decimal"
                      placeholder="0"
                    />
                  ))}
                </div>

                <p className="text-xs text-[color:var(--text-dim)]">
                  {base ? t('products.autoValues') : t('products.manualValues')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Ultima riga: bottoni piccoli allineati a destra, con le conferme. */}
        <ModalActions compact showReset guard={guard} canSave={valid && dirty} />
      </div>
    </div>
  )
}

export default CustomMealEditor
