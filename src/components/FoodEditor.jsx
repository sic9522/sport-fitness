import { useState, useRef, useEffect } from 'react'
import { IoClose, IoChevronDown, IoCameraOutline, IoSearch, IoSaveOutline } from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'
import useScrollLock from '../hooks/useScrollLock'
import { titleCase } from '../utils/text'
import { MEALS } from '../data/nutritionDefaults'
import { searchFoodItems, getFoodItemByBarcode } from '../services/catalogs'
import { fetchFoodByBarcodeOnline } from '../services/offApi'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import Field from './ui/Field'
import Wheel from './Wheel'
import BarcodeScanner from './BarcodeScanner'

// Stessa resa dell'<input> di Field, che accetta solo props native di <input>.
const SELECT_CLS = 'w-full bg-[var(--surface)] border border-[color:var(--border-2)] rounded-xl px-4 py-3 text-sm text-[color:var(--text)] outline-none focus:ring-1 focus:ring-[var(--accent)]'

// I valori del catalogo sono per 100 g: qui li scalo sulla quantità inserita.
// kcal arrotondate all'intero, macro a un decimale. `base` = valori/100 g (o null = manuale).
function scaledFrom(base, grammiStr) {
  const g = Number(grammiStr)
  const f = Number.isFinite(g) && g > 0 ? g / 100 : 1
  const r1 = v => (v == null ? '' : String(Math.round(v * f * 10) / 10))
  return {
    kcal: base.kcal == null ? '' : String(Math.round(base.kcal * f)),
    protein: r1(base.protein),
    carbs: r1(base.carbs),
    fat: r1(base.fat),
    sugars: r1(base.sugars),
    fiber: r1(base.fiber),
  }
}

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
  const [day, setDay] = useState(date)
  const [dayOpen, setDayOpen] = useState(false) // popover del wheel data
  const [base, setBase] = useState(null)         // valori/100 g del prodotto scelto (null = manuale)
  const [results, setResults] = useState([])     // risultati ricerca catalogo
  const [showResults, setShowResults] = useState(false)
  const [searching, setSearching] = useState(false)
  const [scanOpen, setScanOpen] = useState(false) // scanner barcode a tutto schermo
  const [scanMsg, setScanMsg] = useState('')      // esito scansione (codice non in catalogo)
  const dayRef = useRef(null)
  const searchRef = useRef(null)
  const searchTimer = useRef(null)
  const set = patch => setForm(f => ({ ...f, ...patch }))

  useEffect(() => () => clearTimeout(searchTimer.current), [])

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

  // Chiudi la tendina dei risultati toccando fuori dal campo di ricerca.
  useEffect(() => {
    if (!showResults) return undefined
    function onDown(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [showResults])

  const valid = form.nome.trim() !== '' && String(form.kcal).trim() !== ''
  const wheelOptions = dayOptions.map(o => ({ value: o.key, label: o.label }))
  const dayLabel = dayOptions.find(o => o.key === day)?.label ?? ''

  // Digitando nel Nome: torna in modalità manuale e cerca nel catalogo (debounce).
  function onName(v) {
    set({ nome: v })
    setBase(null)
    clearTimeout(searchTimer.current)
    if (!isSupabaseConfigured || v.trim().length < 2) { setResults([]); setShowResults(false); return }
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      setShowResults(true)
      try {
        setResults(await searchFoodItems(v.trim(), { limit: 8 }))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }

  // Scelta di un prodotto dal catalogo: memorizza i valori/100 g e riempie la form.
  function pickFood(item) {
    const b = {
      kcal: item.calories_kcal, protein: item.protein_g, carbs: item.carbs_g,
      fat: item.fat_g, sugars: item.sugar_g, fiber: item.fiber_g,
    }
    setBase(b)
    set({ nome: item.name, grammi: '100', ...scaledFrom(b, '100') })
    setResults([])
    setShowResults(false)
    setScanMsg('')
  }

  // Codice letto dallo scanner: prima il catalogo locale (veloce e offline), poi come
  // ripiego Open Food Facts. Il catalogo copre i prodotti marcati per l'Italia, ma su uno
  // scaffale vero capitano importati ed edizioni estere che lì non ci sono.
  async function handleScan(code) {
    setScanOpen(false)
    setScanMsg(t('nutrition.scanLooking'))
    try {
      const local = await getFoodItemByBarcode(code)
      if (local) { pickFood(local); return }
    } catch {
      // catalogo non raggiungibile: si prova comunque online
    }
    const online = await fetchFoodByBarcodeOnline(code)
    if (online) pickFood(online)
    else setScanMsg(t('nutrition.scanNotFound', { code }))
  }

  // Cambio grammi: se il valore viene dal catalogo, riscala kcal e macro.
  function onGrammi(v) {
    set({ grammi: v })
    if (base) set(scaledFrom(base, v))
  }

  // Modifica manuale delle kcal (solo quando NON viene dal catalogo): solo numeri.
  function onKcal(v) {
    set({ kcal: v.replace(/\D/g, '') })
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
          onClick={onCancel}
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
          {/* Micro-label sopra la select, come i campi (Field) e come il mockup. */}
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">{t('nutrition.meal')}</span>
            <select value={sel} onChange={e => setSel(e.target.value)} className={SELECT_CLS}>
              {MEALS.map(m => (
                <option key={m.key} value={m.key}>{t(m.labelKey)}</option>
              ))}
            </select>
          </label>

          {/* Nome = ricerca sul catalogo: digita → tendina risultati → scegli e riempi.
              A destra il pulsante fotocamera (scansione barcode, in arrivo). */}
          <div ref={searchRef} className="relative">
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">{t('goals.name')}</span>
              <div className="relative">
                {/* Lente a sinistra: il campo si legge come una ricerca (come nel mockup). */}
                <IoSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-[color:var(--text-faint)]" />
                <input
                  value={form.nome}
                  onChange={e => onName(e.target.value)}
                  onFocus={() => { if (results.length) setShowResults(true) }}
                  placeholder={t('nutrition.searchPlaceholder')}
                  autoComplete="off"
                  className="w-full bg-[var(--surface)] border border-[color:var(--border-2)] rounded-xl pl-10 pr-12 py-3 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] placeholder:text-[color:var(--text-faint)]"
                />
                <button
                  type="button"
                  aria-label={t('nutrition.scan')}
                  onClick={() => setScanOpen(true)}
                  className="absolute inset-y-0 right-0 m-3 flex items-center text-[color:var(--accent)]"
                >
                  <IoCameraOutline className="text-xl" />
                </button>
              </div>
            </label>
            {scanMsg && <p className="mt-1 text-xs text-[color:var(--text-dim)]">{scanMsg}</p>}
            {showResults && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-52 overflow-y-auto rounded-xl bg-[var(--surface)] border border-[color:var(--border-2)] shadow-xl">
                {searching && results.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-[color:var(--text-dim)]">{t('nutrition.searching')}</p>
                ) : results.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-[color:var(--text-dim)]">{t('nutrition.searchNoResults')}</p>
                ) : (
                  results.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={e => e.preventDefault()} // non far perdere il focus prima del click
                      onClick={() => pickFood(item)}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--surface-3)] transition-colors border-b border-[color:var(--border-1)] last:border-0"
                    >
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-[color:var(--text-dim)] truncate">
                        {item.brand ? `${item.brand} · ` : ''}
                        {item.calories_kcal != null ? Math.round(item.calories_kcal) : '?'} {t('nutrition.kcal')}/100g
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

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

        <div className="flex gap-2 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full py-3 font-semibold border border-[color:var(--border-2)] text-[color:var(--text)] hover:bg-[var(--surface-3)] transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={save}
            disabled={!valid}
            className="flex-1 flex items-center justify-center gap-2 rounded-full py-3 font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            <IoSaveOutline className="text-lg" />
            {t('common.save')}
          </button>
        </div>
      </div>

      {scanOpen && <BarcodeScanner onScan={handleScan} onClose={() => setScanOpen(false)} />}
    </div>
  )
}

export default FoodEditor
