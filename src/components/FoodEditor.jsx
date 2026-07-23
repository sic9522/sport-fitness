import { useState, useRef, useEffect } from 'react'
import { IoClose, IoChevronDown } from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'
import useScrollLock from '../hooks/useScrollLock'
import useModalGuard, { useDirty } from '../hooks/useModalGuard'
import { titleCase } from '../utils/text'
import { onlyDigits, decimalInput } from '../utils/numberInput'
import { MEALS, MACRO_KEYS, baseFromFoodItem, scaleNutrients } from '../data/nutritionDefaults'
import { loadCustomMeals, findCustomMeal, NO_CUSTOM_MEAL } from '../data/customMeals'
import Field from './ui/Field'
import ModalActions from './ui/ModalActions'
import Wheel from './Wheel'
import FoodSearchInput from './FoodSearchInput'

// Stessa resa dell'<input> di Field, che accetta solo props native di <input>.
export const SELECT_CLS = 'w-full bg-[var(--surface)] border border-[color:var(--border-2)] rounded-xl px-4 py-3 text-sm text-[color:var(--text)] outline-none focus:ring-1 focus:ring-[var(--accent)]'

// Editor di un alimento (nuovo o esistente). Lavora su copie locali (`form`, `sel`, `day`):
// si applica solo con Salva; Annulla o X scartano. Nome e kcal sono obbligatori.
// Il campo Nome fa anche da RICERCA sul catalogo (food_items): scegliendo un prodotto si
// riempiono kcal e macro (per 100 g), e cambiando i grammi i valori si riscalano.
// Due selettori: il GIORNO (accanto al titolo, default oggi; wheel come il timer) e il PASTO.
function FoodEditor({ food, meal, date, dayOptions, onSave, onCancel }) {
  const { t } = useLang()
  useScrollLock()
  const [form, setForm] = useState(food)
  const [sel, setSel] = useState(meal)
  // Pasti personalizzati (creati in Prodotti → Personali). Si leggono una volta
  // all'apertura della modale: stanno in localStorage, non cambiano da soli.
  const [customMeals] = useState(loadCustomMeals)
  const [custom, setCustom] = useState(NO_CUSTOM_MEAL)
  const [day, setDay] = useState(date)
  const [dayOpen, setDayOpen] = useState(false) // popover del wheel data
  const [base, setBase] = useState(null)         // valori/100 g del prodotto scelto (null = manuale)
  const dayRef = useRef(null)
  const set = patch => setForm(f => ({ ...f, ...patch }))

  // Chiudi il popover data toccando fuori (come il selettore del timer).
  useEffect(() => {
    if (!dayOpen) return undefined
    function onDown(e) {
      if (dayRef.current && !dayRef.current.contains(e.target)) setDayOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [dayOpen])

  const valid = form.nome.trim() !== '' && String(form.kcal).trim() !== ''
  const dirty = useDirty({ form, sel, day })
  const guard = useModalGuard({ dirty, onSave: save, onCancel })
  const wheelOptions = dayOptions.map(o => ({ value: o.key, label: o.label }))
  const dayLabel = dayOptions.find(o => o.key === day)?.label ?? ''

  // Digitando nel Nome: torna in modalità manuale (i valori non sono più quelli
  // di un prodotto, quindi non si riscalano più sui grammi).
  function onName(v) {
    set({ nome: v })
    setBase(null)
  }

  // Scelta di un prodotto dal catalogo: memorizza i valori/100 g e riempie la form.
  function pickFood(item) {
    const b = baseFromFoodItem(item)
    setBase(b)
    set({ nome: item.name, grammi: '100', ...scaleNutrients(b, '100') })
  }

  // Scelta di un pasto personalizzato: ne copia i valori nella form, come fa
  // `pickFood` col catalogo. "Nessuno" non svuota nulla: si limita a sganciare
  // la form dal pasto scelto, così quanto già scritto non sparisce per sbaglio.
  function pickCustomMeal(id) {
    setCustom(id)
    const m = findCustomMeal(customMeals, id)
    if (!m) return
    setBase(null) // valori presi così come sono: non si riscalano sui grammi
    if (m.meal) setSel(m.meal) // il pasto scelto quando è stato creato
    set({
      nome: m.nome ?? '',
      grammi: m.grammi ?? '',
      kcal: m.kcal ?? '',
      ...Object.fromEntries(MACRO_KEYS.map(k => [k, m[k] ?? ''])),
    })
  }

  // Cambio grammi: se il valore viene dal catalogo, riscala kcal e macro.
  // `decimalInput` perché su tastiera italiana il tasto decimale è la virgola,
  // e "10,5" arriverebbe a `Number()` come NaN (nessuna riscalatura, in silenzio).
  function onGrammi(v) {
    const g = decimalInput(v)
    set({ grammi: g })
    if (base) set(scaleNutrients(base, g))
  }

  // Modifica manuale delle kcal (solo quando NON viene dal catalogo): solo numeri.
  function onKcal(v) {
    set({ kcal: onlyDigits(v) })
    setBase(null)
  }

  function save() {
    if (!valid) return
    onSave(day, sel, { ...form, nome: titleCase(form.nome.trim()) })
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

        {/* Titolo · "al giorno:" · select data, tutto sulla stessa riga (pr per non finire
            sotto la X di chiusura). La data intercetta oggi per default. */}
        <div className="flex items-center gap-2 mt-1 mb-4 pr-8">
          <h3 className="text-sm font-bold uppercase tracking-wide text-[color:var(--text-dim)] shrink-0">
            {t('nutrition.addMealTitle')}
          </h3>
          <span className="text-xs text-[color:var(--text-dim)] shrink-0">{t('nutrition.onDay')}</span>

          {/* Selettore data: badge compatto → popover con wheel scrollabile (5 righe),
              come quello del timer. Non si espande con tutte le date insieme. */}
          <div ref={dayRef} className="relative shrink-0">
            {/* Larghezza FISSA: il badge non cambia dimensione tra date a 1 e 2 cifre,
                così il popover (centrato su di esso) non si sposta scorrendo. */}
            <button
              type="button"
              onClick={() => setDayOpen(o => !o)}
              aria-label={t('nutrition.day')}
              className="flex items-center justify-between gap-1 w-[74px] rounded-lg bg-[var(--surface)] border border-[color:var(--border-2)] pl-2 pr-1.5 py-1 text-xs text-[color:var(--text)] hover:bg-[var(--surface-3)] transition-colors"
            >
              <span className="truncate">{dayLabel}</span>
              <IoChevronDown className={`shrink-0 text-[10px] text-[color:var(--text-dim)] transition-transform ${dayOpen ? 'rotate-180' : ''}`} />
            </button>

            {dayOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-30 rounded-xl p-1 bg-[var(--surface)] border border-[color:var(--border-2)] shadow-xl">
                {/* Centrato sul badge (come il timer). Click su una riga: sceglie la data
                    e chiude; lo scroll lascia aperto. */}
                <Wheel options={wheelOptions} value={day} onChange={setDay} onPick={() => setDayOpen(false)} visible={5} width={88} itemH={30} scrollbar={8} />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {/* Prima riga: pasto della giornata + eventuale pasto personalizzato.
              Micro-label sopra le select, come i campi (Field) e come il mockup. */}
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">{t('nutrition.meal')}</span>
              <select value={sel} onChange={e => setSel(e.target.value)} className={SELECT_CLS}>
                {MEALS.map(m => (
                  <option key={m.key} value={m.key}>{t(m.labelKey)}</option>
                ))}
              </select>
            </label>

            {/* "Nessuno" + i pasti creati in Prodotti → Personali. */}
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)] truncate">{t('nutrition.customMeal')}</span>
              <select value={custom} onChange={e => pickCustomMeal(e.target.value)} className={SELECT_CLS}>
                <option value={NO_CUSTOM_MEAL}>{t('nutrition.noCustomMeal')}</option>
                {customMeals.map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Nome = ricerca sul catalogo: digita → tendina risultati → scegli e riempi.
              Campo condiviso con la modale dei pasti personalizzati. */}
          <FoodSearchInput value={form.nome} onChange={onName} onPick={pickFood} />

          <div className="grid grid-cols-2 gap-2">
            <Field label={t('nutrition.grams')} value={form.grammi} onChange={e => onGrammi(e.target.value)} inputMode="numeric" placeholder="100" />
            {/* Se l'alimento viene dal catalogo, le kcal sono derivate dai grammi → sola lettura. */}
            {/* Le kcal totali sono il dato in evidenza della modale → colore d'accento. */}
            <Field
              label={t('nutrition.kcal')}
              value={form.kcal}
              onChange={e => onKcal(e.target.value)}
              inputMode="numeric"
              placeholder="0"
              readOnly={!!base}
              className={base ? 'opacity-70' : ''}
              style={{ color: 'var(--accent)', fontWeight: 700 }}
            />
          </div>
        </div>

        <ModalActions guard={guard} canSave={valid && dirty} />
      </div>
    </div>
  )
}

export default FoodEditor
