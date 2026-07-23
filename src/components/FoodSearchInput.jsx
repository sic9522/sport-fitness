import { useState, useRef, useEffect } from 'react'
import { IoCameraOutline, IoSearch } from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'
import { searchFoodItems, getFoodItemByBarcode, isGenericFood } from '../services/catalogs'
import { fetchFoodByBarcodeOnline } from '../services/offApi'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import {
  loadCustomFoods, searchCustomFoods, mergeCustomFoods,
  isCustomFood, foodDisplayName,
} from '../data/customFoods'
import { loadHiddenFoods, filterHidden } from '../data/hiddenFoods'
import BarcodeScanner from './BarcodeScanner'

// Campo "Nome" che fa anche da RICERCA sul catalogo (food_items): digitando compare
// la tendina dei risultati, scegliendone uno il chiamante riceve il prodotto intero.
// A destra la fotocamera per il barcode. Condiviso da FoodEditor e CustomMealEditor,
// così il campo è lo stesso in entrambe le modali.
// `onChange(testo)` = digitazione libera, `onPick(item)` = prodotto scelto.
function FoodSearchInput({ value, onChange, onPick, label }) {
  const { t } = useLang()
  const [results, setResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [searching, setSearching] = useState(false)
  const [scanOpen, setScanOpen] = useState(false) // scanner barcode a tutto schermo
  const [scanMsg, setScanMsg] = useState('')      // esito scansione (codice non in catalogo)
  // Alimenti personali: stanno in locale, si leggono una volta all'apertura.
  // SOLO gli originali: le varianti non si cercano, si scelgono dopo con i
  // bottoni V1…V5 (vedi FoodEditor). In tendina sarebbero sette righe quasi
  // uguali tra l'utente e il piatto che sta cercando.
  const [myFoods] = useState(() => loadCustomFoods())
  // Un prodotto nascosto non deve ricomparire proprio qui, dove si compila il
  // diario: è il posto per cui uno l'ha nascosto.
  const [hiddenSet] = useState(() => new Set(loadHiddenFoods()))
  const boxRef = useRef(null)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  // Chiudi la tendina dei risultati toccando fuori dal campo.
  useEffect(() => {
    if (!showResults) return undefined
    function onDown(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setShowResults(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [showResults])

  // Digitando: i propri alimenti si mostrano SUBITO (sono in memoria), il
  // catalogo arriva dopo il debounce e li ingloba. Senza Supabase restano loro.
  function onType(v) {
    onChange(v)
    clearTimeout(timer.current)
    const mine = filterHidden(searchCustomFoods(myFoods, v), hiddenSet)
    if (v.trim().length < 2) { setResults([]); setShowResults(false); return }
    setResults(mine)
    setShowResults(true)
    if (!isSupabaseConfigured) return
    timer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const remote = filterHidden(await searchFoodItems(v.trim(), { limit: 8 }), hiddenSet)
        setResults(mergeCustomFoods(remote, mine))
      } catch {
        setResults(mine)
      } finally {
        setSearching(false)
      }
    }, 300)
  }

  function pick(item) {
    onPick(item)
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
      if (local) { pick(local); return }
    } catch {
      // catalogo non raggiungibile: si prova comunque online
    }
    const online = await fetchFoodByBarcodeOnline(code)
    if (online) pick(online)
    else setScanMsg(t('nutrition.scanNotFound', { code }))
  }

  return (
    <div ref={boxRef} className="relative">
      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">{label ?? t('goals.name')}</span>
        <div className="relative">
          {/* Lente a sinistra: il campo si legge come una ricerca (come nel mockup). */}
          <IoSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-[color:var(--text-faint)]" />
          <input
            value={value}
            onChange={e => onType(e.target.value)}
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
                onClick={() => pick(item)}
                className="w-full text-left px-3 py-2 hover:bg-[var(--surface-3)] transition-colors border-b border-[color:var(--border-1)] last:border-0"
              >
                {/* I composti portano l'asterisco: i loro valori sono una stima. */}
                <p className="text-sm font-medium truncate">{foodDisplayName(item)}</p>
                {/* I generici non hanno marca: al suo posto si dice che sono tali,
                    così si capisce perché stanno in cima e che sono valori medi. */}
                <p className="text-xs text-[color:var(--text-dim)] truncate">
                  {isCustomFood(item)
                    ? `${t('products.customFood')} · `
                    : isGenericFood(item) ? `${t('products.generic')} · ` : item.brand ? `${item.brand} · ` : ''}
                  {item.calories_kcal != null ? Math.round(item.calories_kcal) : '?'} {t('nutrition.kcal')}/100g
                </p>
              </button>
            ))
          )}
        </div>
      )}

      {scanOpen && <BarcodeScanner onScan={handleScan} onClose={() => setScanOpen(false)} />}
    </div>
  )
}

export default FoodSearchInput
