import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoBagHandleOutline, IoAdd, IoSearch, IoClose, IoChevronDown, IoTrashOutline } from 'react-icons/io5'
import TopBar from '../components/TopBar'
import ConfirmModal from '../components/ConfirmModal'
import useLongPress from '../hooks/useLongPress'
import CustomMealEditor from '../components/CustomMealEditor'
import CustomFoodEditor from '../components/CustomFoodEditor'
import CompositeFoodEditor from '../components/CompositeFoodEditor'
import FoodFilterBar from '../components/FoodFilterBar'
import { useLang } from '../context/LanguageContext'
import { listFoodItems, listGenericFoods, searchFoodItems, isGenericFood } from '../services/catalogs'
import { groupByInitial } from '../data/foodIndex'
import { sortFoods, sortFieldByKey } from '../data/foodSort'
import { filterHidden } from '../data/hiddenFoods'
import useHiddenFoods from '../hooks/useHiddenFoods'
import { loadCustomMeals, saveCustomMeals, upsertCustomMeal } from '../data/customMeals'
import {
  loadCustomFoods, saveCustomFoods, upsertCustomFood, removeCustomFood, foodDisplayName,
  isCompositeFood, isCustomFood, hasVariants, addVariant, removeVariant, flattenCustomFoods,
} from '../data/customFoods'
import { isSupabaseConfigured } from '../lib/supabaseClient'

const TABS = [
  { key: 'catalog', labelKey: 'products.tabCatalog' },
  { key: 'custom', labelKey: 'products.tabCustom' },
]

// Sotto-tab della lista prodotti: la propria (in memoria) e il catalogo (a pagine).
const LIST_TABS = [
  { key: 'personal', labelKey: 'products.listPersonal' },
  { key: 'all', labelKey: 'products.listAll' },
]

const PAGE_SIZE = 50

// Il catalogo si legge in due "secchi" (vedi services/catalogs): prima i nomi che
// iniziano per lettera, poi cifre e simboli. La pagina li concatena, così i
// caratteri speciali finiscono tutti in fondo invece che in testa.
const BUCKETS = [false, true] // false = lettere, true = speciali

// Legge una pagina e, se il secchio è finito, riparte dal primo blocco di quello
// dopo: chi chiama non deve accorgersi del passaggio. Fuori dal componente perché
// non tocca lo stato — restituisce solo cosa ha letto e da dove ripartire.
async function fetchPage(bucket, page, sort = { col: 'name', asc: true }) {
  // Ordinando per kcal o per un macro i due secchi non servono: l'ordine è
  // numerico e i caratteri speciali non c'entrano nulla.
  if (sort.col !== 'name') {
    const rows = await listFoodItems({
      page, pageSize: PAGE_SIZE, orderBy: sort.col, ascending: sort.asc,
    })
    return { rows, bucket: BUCKETS.length - 1, page: page + 1 }
  }

  const rows = await listFoodItems({
    page, pageSize: PAGE_SIZE, specials: BUCKETS[bucket], ascending: sort.asc,
  })
  if (rows.length === 0 && bucket < BUCKETS.length - 1) {
    const next = bucket + 1
    return {
      rows: await listFoodItems({ page: 0, pageSize: PAGE_SIZE, specials: BUCKETS[next], ascending: sort.asc }),
      bucket: next,
      page: 1,
    }
  }
  return { rows, bucket, page: page + 1 }
}

function Prodotti() {
  const navigate = useNavigate()
  const { t } = useLang()

  const [tab, setTab] = useState('catalog')
  const [items, setItems] = useState([])
  const [bucket, setBucket] = useState(0) // indice in BUCKETS
  const [page, setPage] = useState(0)
  const [done, setDone] = useState(false)  // niente più da caricare
  const [loading, setLoading] = useState(isSupabaseConfigured) // la prima pagina parte da sola
  const [error, setError] = useState('')

  const [query, setQuery] = useState('')
  const [search, setSearch] = useState(null) // null = elenco completo, array = risultati
  const searchTimer = useRef(null)

  const [customMeals, setCustomMeals] = useState(loadCustomMeals)
  const [createOpen, setCreateOpen] = useState(false)

  const [customFoods, setCustomFoods] = useState(loadCustomFoods)
  const [createFoodOpen, setCreateFoodOpen] = useState(false)
  const [createCompositeOpen, setCreateCompositeOpen] = useState(false)
  const [editingMeal, setEditingMeal] = useState(null)
  const [editingFood, setEditingFood] = useState(null)
  const [editingVariant, setEditingVariant] = useState(null) // { parent, variant }
  const [variantOf, setVariantOf] = useState(null)           // originale della nuova variante
  const [openFood, setOpenFood] = useState(null)             // accordion aperto (uno solo)
  const [deleting, setDeleting] = useState(null)             // { kind, item(s), parent? }

  const [listTab, setListTab] = useState('personal')
  const [genericFoods, setGenericFoods] = useState([])
  const [personalQuery, setPersonalQuery] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [ascending, setAscending] = useState(true)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  // Prodotti che l'utente non vuole più vedere (suoi, sincronizzati sull'account).
  const { hidden, hiddenSet, hide, restoreAll } = useHiddenFoods()

  const sort = { col: sortFieldByKey(sortKey).col, asc: ascending }
  const byName = sort.col === 'name'

  const clearSelection = () => { setSelecting(false); setSelected(new Set()) }
  const toggleSelected = id => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  function saveCustom(meal) {
    const next = upsertCustomMeal(customMeals, meal)
    setCustomMeals(next)
    saveCustomMeals(next)
    setCreateOpen(false)
    setEditingMeal(null)
  }

  function commitFoods(next) {
    setCustomFoods(next)
    saveCustomFoods(next)
  }

  // Una variante vive dentro il suo originale: si salva lì, non nell'elenco.
  function saveVariant(parentId, variant) {
    commitFoods(addVariant(customFoods, parentId, variant))
    setVariantOf(null)
    setEditingVariant(null)
  }

  function confirmDelete() {
    if (deleting.kind === 'bulk') {
      // Due destini diversi, un solo gesto per l'utente:
      //   * la roba PROPRIA si cancella davvero;
      //   * i prodotti del catalogo (e i generici) non si possono cancellare —
      //     sono condivisi — quindi si NASCONDONO: da qui in poi non compaiono
      //     più in nessun elenco né nella ricerca, su tutti i suoi dispositivi.
      const ids = new Set(deleting.items.filter(isCustomFood).map(f => f.id))
      commitFoods(customFoods
        .filter(f => !ids.has(f.id))
        .map(f => (f.variants ? { ...f, variants: f.variants.filter(v => !ids.has(v.id)) } : f)))
      hide(deleting.items.filter(f => !isCustomFood(f)).map(f => f.id))
      clearSelection()
      setDeleting(null)
      return
    }
    if (deleting.kind === 'meal') {
      const next = customMeals.filter(m => m.id !== deleting.item.id)
      setCustomMeals(next)
      saveCustomMeals(next)
    } else if (deleting.kind === 'variant') {
      commitFoods(removeVariant(customFoods, deleting.parent.id, deleting.item.id))
    } else {
      commitFoods(removeCustomFood(customFoods, deleting.item.id))
    }
    setDeleting(null)
  }

  // Semplici e composti stanno nella stessa lista: si distinguono da `components`
  // e cercandoli valgono uguale.
  function saveFood(food) {
    commitFoods(upsertCustomFood(customFoods, food))
    setCreateFoodOpen(false)
    setCreateCompositeOpen(false)
    setEditingFood(null)
  }

  // Accoda una pagina letta e memorizza da dove ripartire. Ultimo secchio + pagina
  // non piena = elenco finito, così non si spara una query a vuoto.
  const apply = useCallback(res => {
    setItems(prev => [...prev, ...res.rows])
    setBucket(res.bucket)
    setPage(res.page)
    if (res.bucket === BUCKETS.length - 1 && res.rows.length < PAGE_SIZE) setDone(true)
    setLoading(false)
  }, [])

  const fail = useCallback(err => {
    setError(err.message)
    setLoading(false)
  }, [])

  // Prima pagina all'apertura (solo col catalogo raggiungibile). Lo stato si
  // aggiorna nella callback, non nel corpo dell'effetto.
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let alive = true
    fetchPage(0, 0).then(
      res => { if (alive) apply(res) },
      err => { if (alive) fail(err) },
    )
    return () => { alive = false }
  }, [apply, fail])

  function loadMore() {
    if (loading || done) return
    setLoading(true)
    setError('')
    fetchPage(bucket, page, sort).then(apply, fail)
  }

  // Cambiare ordinamento cambia l'ordine sul DATABASE, non solo a schermo:
  // sulle 223.000 righe del catalogo riordinare la sola pagina caricata darebbe
  // una classifica finta. Quindi si riparte dalla prima pagina.
  function reloadWith(nextSort) {
    if (!isSupabaseConfigured || listTab !== 'all') return
    setItems([])
    setPage(0)
    setBucket(0)
    setDone(false)
    setLoading(true)
    setError('')
    fetchPage(0, 0, nextSort).then(apply, fail)
  }

  function changeSortKey(key) {
    setSortKey(key)
    reloadWith({ col: sortFieldByKey(key).col, asc: ascending })
  }

  function changeAscending(asc) {
    setAscending(asc)
    reloadWith({ col: sort.col, asc })
  }

  // Doppio click su una riga: si può modificare solo la roba propria. I prodotti
  // del catalogo (e i generici) stanno su un database condiviso in sola lettura.
  function editFromCatalog(item) {
    if (isCustomFood(item)) setEditingFood(item)
  }

  // Gli alimenti generici sono poche centinaia: si leggono una volta sola e
  // restano in memoria, così la lista personalizzata filtra e ordina senza query.
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let alive = true
    listGenericFoods().then(
      rows => { if (alive) setGenericFoods(rows) },
      () => { if (alive) setGenericFoods([]) },
    )
    return () => { alive = false }
  }, [])

  useEffect(() => () => clearTimeout(searchTimer.current), [])

  // Ricerca: sostituisce l'elenco finché il campo non viene svuotato.
  function onQuery(v) {
    setQuery(v)
    clearTimeout(searchTimer.current)
    if (v.trim().length < 2) { setSearch(null); return }
    searchTimer.current = setTimeout(async () => {
      setLoading(true)
      try {
        setSearch(await searchFoodItems(v.trim(), { limit: 50 }))
        setError('')
      } catch (err) {
        setError(err.message)
        setSearch([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  // I risultati di ricerca arrivano ordinati per rilevanza dalla RPC: riordinarli
  // qui è giusto, perché l'utente ha chiesto esplicitamente un altro criterio.
  // Quello che l'utente ha nascosto sparisce da OGNI elenco, non solo da dove
  // l'ha nascosto: è una preferenza sul prodotto, non su una schermata.
  const shown = sortFoods(filterHidden(search ?? items, hiddenSet), sort.col, sort.asc)
  const groups = groupByInitial(shown)

  // Lista personalizzata: i nostri generici + tutto quello che si è creato
  // l'utente (varianti comprese). Sta tutta in memoria, quindi filtro e ordine
  // non costano una query.
  const personalList = sortFoods(
    filterHidden(
      filterByName([...genericFoods, ...flattenCustomFoods(customFoods)], personalQuery),
      hiddenSet,
    ),
    sort.col,
    sort.asc,
  )

  const visible = listTab === 'personal' ? personalList : shown
  const allSelected = visible.length > 0 && visible.every(f => selected.has(f.id))

  const filterBarProps = {
    sortKey,
    onSortKey: changeSortKey,
    ascending: sort.asc,
    onAscending: changeAscending,
    selecting,
    onToggleSelecting: () => { setSelecting(s => !s); setSelected(new Set()) },
    allSelected,
    onToggleAll: () => setSelected(allSelected ? new Set() : new Set(visible.map(f => f.id))),
    selectedCount: selected.size,
    onDelete: () => setDeleting({ kind: 'bulk', items: visible.filter(f => selected.has(f.id)) }),
    hiddenCount: hidden.length,
    onRestoreHidden: restoreAll,
  }

  // Semplici e composti stanno nella stessa lista (per ricerca e nomi), ma nella
  // pagina sono due blocchi distinti: si creano in modi diversi e si guardano
  // per motivi diversi.
  const simpleFoods = customFoods.filter(f => !isCompositeFood(f))
  const compositeFoods = customFoods.filter(isCompositeFood)

  return (
    <div className="flex flex-col pb-28">
      <TopBar icon={IoBagHandleOutline} title={t('title.products')} onBack={() => navigate('/alimentazione')} />

      <div className="px-5 pt-4">
        {/* Tab a larghezza piena, stessa pill dei periodi in Alimentazione. */}
        <div className="grid grid-cols-2 gap-1 bg-[var(--surface-2)] rounded-full p-1">
          {TABS.map(tb => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className="py-1.5 rounded-full text-xs font-semibold transition-all"
              style={tab === tb.key ? { backgroundColor: 'var(--accent)', color: 'var(--on-accent)' } : { color: 'var(--text-dim)' }}
            >
              {t(tb.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {tab === 'catalog' && (
        <div className="px-5 mt-4">
          {/* Due liste: la propria (nostri generici + roba dell'utente, tutta in
              memoria) e il catalogo intero (a pagine dal database). */}
          <div className="grid grid-cols-2 gap-1 bg-[var(--surface-2)] rounded-full p-1 mb-4">
            {LIST_TABS.map(lt => (
              <button
                key={lt.key}
                onClick={() => { setListTab(lt.key); clearSelection() }}
                className="py-1.5 rounded-full text-xs font-semibold transition-all"
                style={listTab === lt.key
                  ? { backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }
                  : { color: 'var(--text-dim)' }}
              >
                {t(lt.labelKey)}
              </button>
            ))}
          </div>

          {!isSupabaseConfigured ? (
            <p className="text-[color:var(--text-faint)] text-sm py-6 text-center">{t('products.needsSupabase')}</p>
          ) : listTab === 'personal' ? (
            <>
              <SearchField
                value={personalQuery}
                onChange={setPersonalQuery}
                placeholder={t('products.searchPlaceholder')}
              />
              <FoodFilterBar {...filterBarProps} />

              {personalList.length === 0 ? (
                <p className="text-[color:var(--text-faint)] text-sm py-6 text-center">{t('products.empty')}</p>
              ) : (
                <div className="rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] overflow-hidden">
                  {personalList.map(item => (
                    <CatalogRow
                      key={item.id}
                      item={item}
                      selecting={selecting}
                      selected={selected.has(item.id)}
                      onToggleSelect={() => toggleSelected(item.id)}
                      onEdit={() => editFromCatalog(item)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <SearchField value={query} onChange={onQuery} placeholder={t('products.searchPlaceholder')} />
              <FoodFilterBar {...filterBarProps} />

              {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

              {groups.length === 0 && !loading && (
                <p className="text-[color:var(--text-faint)] text-sm py-6 text-center">{t('products.empty')}</p>
              )}

              <div className="flex flex-col gap-4">
                {groups.map(g => (
                  <section key={`${g.initial}-${g.items[0].id}`}>
                    {/* Le lettere hanno senso solo in ordine alfabetico: ordinando
                        per kcal sarebbero intestazioni a caso. */}
                    {byName && (
                      <h3 className="text-xs font-bold uppercase tracking-widest text-[color:var(--accent)] mb-1.5 px-1">
                        {g.initial}
                      </h3>
                    )}
                    <div className="rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] overflow-hidden">
                      {g.items.map(item => (
                        <CatalogRow
                          key={item.id}
                          item={item}
                          selecting={selecting}
                          selected={selected.has(item.id)}
                          onToggleSelect={() => toggleSelected(item.id)}
                          onEdit={() => editFromCatalog(item)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              {/* Il catalogo ha centinaia di migliaia di righe: si carica a pagine,
                  su richiesta. Durante la ricerca non c'è nulla da paginare. */}
              {!search && (
                <button
                  onClick={loadMore}
                  disabled={loading || done}
                  className="mt-4 w-full rounded-full py-3 text-sm font-semibold border border-[color:var(--border-2)] text-[color:var(--text)] hover:bg-[var(--surface-3)] transition-colors disabled:opacity-40"
                >
                  {loading ? t('products.loading') : done ? t('products.allLoaded') : t('products.loadMore')}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'custom' && (
        <div className="px-5 mt-4 flex flex-col gap-6">
          {/* Tre blocchi, tre cose diverse: l'alimento che nel catalogo non c'è,
              il piatto fatto di più alimenti, e il pasto già pronto da richiamare
              nel diario. Ognuno col proprio tasto di creazione. */}
          <PersonalSection
            title={t('products.foodsTitle')}
            empty={simpleFoods.length === 0}
            onCreate={() => setCreateFoodOpen(true)}
            createTitle={t('products.createFood')}
            createHint={t('products.createFoodHint')}
          >
            {simpleFoods.map(f => (
              <PersonalRow
                key={f.id}
                title={f.name}
                value={kcalLabel(f, t)}
                onEdit={() => setEditingFood(f)}
                onDelete={() => setDeleting({ kind: 'food', item: f })}
              />
            ))}
          </PersonalSection>

          <PersonalSection
            title={t('products.compositesTitle')}
            empty={compositeFoods.length === 0}
            onCreate={() => setCreateCompositeOpen(true)}
            createTitle={t('products.createComposite')}
            createHint={t('products.createCompositeHint')}
          >
            {compositeFoods.map(f => {
              const withVariants = hasVariants(f)
              return (
                <div key={f.id} className="border-b border-[color:var(--border-1)] last:border-0">
                  <PersonalRow
                    title={foodDisplayName(f)}
                    value={kcalLabel(f, t)}
                    // Un composto con varianti è un accordion: il click le apre.
                    // Uno alla volta, così l'elenco non diventa un muro.
                    expandable={withVariants}
                    expanded={withVariants && openFood === f.id}
                    onToggle={() => setOpenFood(id => (id === f.id ? null : f.id))}
                    onEdit={() => setEditingFood(f)}
                    onDelete={() => setDeleting({ kind: 'food', item: f })}
                  />

                  {withVariants && openFood === f.id && (
                    <div className="bg-[var(--surface-2)]">
                      {f.variants.map(v => (
                        <PersonalRow
                          key={v.id}
                          nested
                          title={foodDisplayName(v)}
                          value={kcalLabel(v, t)}
                          onEdit={() => setEditingVariant({ parent: f, variant: v })}
                          onDelete={() => setDeleting({ kind: 'variant', item: v, parent: f })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </PersonalSection>

          <PersonalSection
            title={t('products.mealsTitle')}
            empty={customMeals.length === 0}
            onCreate={() => setCreateOpen(true)}
            createTitle={t('products.createCustom')}
            createHint={t('products.createCustomHint')}
          >
            {customMeals.map(m => (
              <PersonalRow
                key={m.id}
                title={m.nome}
                value={`${m.kcal || '—'} ${t('nutrition.kcal')}`}
                onEdit={() => setEditingMeal(m)}
                onDelete={() => setDeleting({ kind: 'meal', item: m })}
              />
            ))}
          </PersonalSection>
        </div>
      )}

      {createOpen && <CustomMealEditor onSave={saveCustom} onCancel={() => setCreateOpen(false)} />}
      {editingMeal && (
        <CustomMealEditor initial={editingMeal} onSave={saveCustom} onCancel={() => setEditingMeal(null)} />
      )}

      {createFoodOpen && (
        <CustomFoodEditor existing={customFoods} onSave={saveFood} onCancel={() => setCreateFoodOpen(false)} />
      )}
      {createCompositeOpen && (
        <CompositeFoodEditor existing={customFoods} onSave={saveFood} onCancel={() => setCreateCompositeOpen(false)} />
      )}

      {/* Modifica: composto o alimento semplice, la modale giusta per il tipo. */}
      {editingFood && (isCompositeFood(editingFood) ? (
        <CompositeFoodEditor
          initial={editingFood}
          existing={customFoods}
          onSave={saveFood}
          onCancel={() => setEditingFood(null)}
          onAddVariant={parent => { setEditingFood(null); setVariantOf(parent) }}
        />
      ) : (
        <CustomFoodEditor initial={editingFood} existing={customFoods} onSave={saveFood} onCancel={() => setEditingFood(null)} />
      ))}

      {/* Nuova variante: parte dagli ingredienti dell'originale, ma quello che
          si cambia qui NON torna nell'originale — diventa una voce a parte. */}
      {variantOf && (
        <CompositeFoodEditor
          asVariant
          initial={variantOf}
          existing={customFoods}
          onSave={v => saveVariant(variantOf.id, v)}
          onCancel={() => setVariantOf(null)}
        />
      )}

      {editingVariant && (
        <CompositeFoodEditor
          initial={editingVariant.variant}
          existing={customFoods}
          onSave={v => saveVariant(editingVariant.parent.id, v)}
          onCancel={() => setEditingVariant(null)}
        />
      )}

      {deleting && (
        <ConfirmModal
          title={t('products.deleteTitle')}
          message={deleting.kind === 'bulk' ? bulkDeleteMessage(deleting.items, t) : t('products.deleteBody', {
            name: deleting.item.nome ?? deleting.item.name,
          })}
          confirmLabel={t('products.deleteConfirm')}
          cancelLabel={t('common.cancel')}
          danger
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

// Etichetta kcal di una voce personale (per 100 g, come il catalogo).
const kcalLabel = (f, t) => `${f.calories_kcal ?? '—'} ${t('nutrition.kcal')}/100g`

// Messaggio della cancellazione multipla. Dice anche quanti NON si toccano: i
// prodotti del catalogo (e i nostri generici) stanno su un database condiviso in
// sola lettura, quindi sparire in silenzio sarebbe una bugia.
function bulkDeleteMessage(items, t) {
  const mine = items.filter(isCustomFood).length
  const others = items.length - mine
  const parts = []
  if (mine) parts.push(t('products.deleteSelectedBody', { n: mine }))
  if (others) parts.push(t('products.deleteSelectedHidden', { n: others }))
  return parts.join(' ')
}

// Filtro per nome della lista personalizzata: stesso criterio della ricerca sul
// catalogo (sottostringa, maiuscole indifferenti), ma senza andare sul database.
function filterByName(list, query) {
  const q = String(query ?? '').trim().toLowerCase()
  if (!q) return list
  return list.filter(f => String(f.name ?? '').toLowerCase().includes(q))
}

// Campo di ricerca con lente e X per svuotare, uguale nelle due liste.
function SearchField({ value, onChange, placeholder }) {
  const { t } = useLang()
  return (
    <div className="relative mb-3">
      <IoSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-[color:var(--text-faint)]" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full bg-[var(--surface)] border border-[color:var(--border-2)] rounded-xl pl-10 pr-10 py-3 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] placeholder:text-[color:var(--text-faint)]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t('common.cancel')}
          className="absolute inset-y-0 right-0 m-3 flex items-center text-[color:var(--text-faint)]"
        >
          <IoClose className="text-lg" />
        </button>
      )}
    </div>
  )
}

// Riga di un alimento negli elenchi di Prodotti. La casella compare solo in
// modalità selezione; il doppio click apre la modifica (solo per la roba propria,
// vedi `editFromCatalog`).
function CatalogRow({ item, selecting, selected, onToggleSelect, onEdit }) {
  const { t } = useLang()
  const own = isCustomFood(item)
  const sub = own ? t('products.customFood') : isGenericFood(item) ? t('products.generic') : item.brand

  return (
    <div
      onDoubleClick={onEdit}
      className="flex items-center gap-3 px-4 py-2.5 border-b border-[color:var(--border-1)] last:border-0"
    >
      {selecting && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label={item.name}
          className="shrink-0 h-4 w-4 accent-[var(--accent)]"
        />
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{foodDisplayName(item)}</p>
        {sub && <p className="text-xs text-[color:var(--text-dim)] truncate">{sub}</p>}
      </div>

      <p className="text-xs tabular-nums shrink-0 text-[color:var(--text-muted)]">
        {item.calories_kcal != null ? Math.round(item.calories_kcal) : '—'} {t('nutrition.kcal')}/100g
      </p>
    </div>
  )
}

// Riga di una voce personale (pasto, alimento, variante).
//
// Tre gesti, come nel resto dell'app:
//   * click       -> apre/chiude le varianti, se ce ne sono;
//   * doppio click-> riapre la modale per modificarla;
//   * pressione prolungata -> arma il cestino rosso, che chiede conferma.
// Il cestino compare solo dopo la pressione lunga: una riga di elenco non deve
// avere un tasto di cancellazione sempre a portata di dito.
function PersonalRow({ title, value, expandable = false, expanded = false, nested = false, onToggle, onEdit, onDelete }) {
  const { t } = useLang()
  const [armed, setArmed] = useState(false)
  const press = useLongPress(() => setArmed(true))

  // Disarma da solo: un cestino rimasto acceso è un incidente che aspetta.
  useEffect(() => {
    if (!armed) return undefined
    const id = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(id)
  }, [armed])

  return (
    <div className={`flex items-center gap-2 px-4 py-3 ${nested ? 'pl-8' : ''}`}>
      <button
        type="button"
        onClick={() => { if (!press.fired.current && expandable) onToggle?.() }}
        onDoubleClick={onEdit}
        onPointerDown={press.start}
        onPointerUp={press.cancel}
        onPointerLeave={press.cancel}
        onPointerCancel={press.cancel}
        onContextMenu={e => e.preventDefault()} // il long press su mobile aprirebbe il menu
        className="flex-1 min-w-0 flex items-center justify-between gap-3 text-left"
      >
        {/* La freccia sta DOPO il nome: prima si legge di cosa si tratta, poi
            si vede che c'è dell'altro sotto. */}
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium truncate">{title}</span>
          {expandable && (
            <IoChevronDown className={`shrink-0 text-xs text-[color:var(--text-dim)] transition-transform ${expanded ? 'rotate-180' : ''}`} />
          )}
        </span>
        <span className="text-xs tabular-nums shrink-0 text-[color:var(--text-muted)]">{value}</span>
      </button>

      {armed && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={t('products.deleteConfirm')}
          className="shrink-0 p-2 rounded-lg text-white"
          style={{ backgroundColor: '#ef4444' }}
        >
          <IoTrashOutline />
        </button>
      )}
    </div>
  )
}

// Blocco della tab "Personali": titolo, elenco e tasto di creazione.
//
// Il tasto cambia forma con lo stato: finché il blocco è vuoto è la card grande
// che spiega a cosa serve; appena c'è del contenuto diventa un "+" accanto al
// titolo, perché a quel punto la spiegazione l'hai già letta e lo spazio serve
// all'elenco.
function PersonalSection({ title, empty, onCreate, createTitle, createHint, children }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-dim)]">{title}</h3>
        {!empty && (
          <button
            onClick={onCreate}
            aria-label={createTitle}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            <IoAdd className="text-lg" />
          </button>
        )}
      </div>

      {empty ? (
        <CreateCard title={createTitle} hint={createHint} onClick={onCreate} />
      ) : (
        <div className="rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] overflow-hidden">
          {children}
        </div>
      )}
    </section>
  )
}

// Card d'invito alla creazione: bordo tratteggiato + pallino con il piu'.
// È lo stato vuoto di un blocco: dice cosa ci si mette e perché.
function CreateCard({ title, hint, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-2xl border border-dashed border-[color:var(--border-2)] bg-[var(--surface)] px-4 py-5 text-left hover:bg-[var(--surface-3)] transition-colors"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
      >
        <IoAdd className="text-xl" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{title}</span>
        <span className="block text-xs text-[color:var(--text-muted)]">{hint}</span>
      </span>
    </button>
  )
}

export default Prodotti
