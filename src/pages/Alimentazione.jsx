import { useState, useRef } from 'react'
import { IoRestaurant, IoChevronBack, IoChevronForward, IoAdd, IoTrashOutline, IoChevronDown } from 'react-icons/io5'
import TopBar from '../components/TopBar'
import RingChart from '../components/RingChart'
import NutritionTrendChart from '../components/NutritionTrendChart'
import FoodEditor from '../components/FoodEditor'
import NutritionGoalsEditor from '../components/NutritionGoalsEditor'
import ConfirmModal from '../components/ConfirmModal'
import { useLang } from '../context/LanguageContext'
import {
  MEALS, MACROS, MACRO_KEYS, todayDate, addDays, dateKey, todayKey, newFoodId,
  loadDiario, saveDiario, dayMeals, dayTotals, sumNutrients,
  rangeTotals, weekDateKeys, monthDateKeys, monthWeeks, dailyKcalSeries, clippedWeek, weekOfMonth,
  loadNutritionGoals, saveNutritionGoals,
} from '../data/nutritionDefaults'
import { useNutritionSync } from '../hooks/useNutritionSync'

// Tab del riepilogo (come in Home): giornaliero / settimanale / andamento mensile.
const PERIODS = [
  { key: 'daily', labelKey: 'period.daily' },
  { key: 'weekly', labelKey: 'period.weekly' },
  { key: 'monthly', labelKey: 'period.monthly' },
]

// Barra macro: etichetta + "valore/obiettivo g" + riempimento colorato (cap 100%).
function MacroBar({ label, value, target, color }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2">
        <span className="text-[color:var(--text-muted)] text-xs">{label}</span>
        <span className="text-[10px] font-bold tabular-nums text-[color:var(--text-dim)]">
          {value}<span className="text-[color:var(--text-faint)]">/{target}g</span>
        </span>
      </div>
      <div className="h-2 bg-[var(--track)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

// Accordion delle barre macro (vs obiettivo del periodo). Riusato per il singolo
// "Macro-nutrienti" (giorno/settimana) e per gli accordion per-settimana (mese).
function MacroAccordion({ title, open, onToggle, totals, goals, mult }) {
  const { t } = useLang()
  return (
    <div className="mt-3 border-t border-[color:var(--border-1)] pt-3">
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-dim)] truncate">{title}</span>
        <IoChevronDown className={`shrink-0 text-[color:var(--text-dim)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="flex flex-col gap-3 mt-3">
          {MACROS.map(m => (
            <MacroBar
              key={m.key}
              label={t(m.shortKey)}
              value={Math.round(totals[m.key])}
              target={Math.round((goals[m.key] || 0) * mult)}
              color={m.color}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Bozza di un nuovo alimento (id generato in handler, non in render).
const newFood = () => ({ id: newFoodId(), nome: '', grammi: '', kcal: '', ...Object.fromEntries(MACRO_KEYS.map(k => [k, ''])) })

function Alimentazione() {
  const { t, lang } = useLang()

  const [selDate, setSelDate] = useState(todayDate)
  const [diario, setDiario] = useState(loadDiario)
  const [goals, setGoals] = useState(loadNutritionGoals)
  const [editing, setEditing] = useState(null)  // { meal, food } → FoodEditor
  const [deleting, setDeleting] = useState(null) // { meal, food } → ConfirmModal
  const [editGoals, setEditGoals] = useState(false)
  const [period, setPeriod] = useState('daily')     // tab attivo: daily | weekly | monthly
  const [macrosOpen, setMacrosOpen] = useState(false) // accordion Macro-nutrienti (giorno/settimana)
  const [openWeeks, setOpenWeeks] = useState({})      // accordion aperti nel mese, per indice settimana

  // Ponte local-first: da loggato rispecchia diario e obiettivi su Supabase (no-op se non configurato).
  useNutritionSync(diario, setDiario, goals, setGoals)

  const key = dateKey(selDate)
  const meals = dayMeals(diario, key)
  const totals = dayTotals(meals)
  const isToday = key === todayKey()

  // Totali e obiettivo del periodo attivo. Obiettivo = giornaliero × giorni del periodo.
  const monthKeys = monthDateKeys(selDate)
  const goalMult = period === 'weekly' ? 7 : period === 'monthly' ? monthKeys.length : 1
  const periodTotals = period === 'weekly' ? rangeTotals(diario, weekDateKeys(selDate))
    : period === 'monthly' ? rangeTotals(diario, monthKeys)
      : totals
  const kcalTarget = Math.round((goals.kcal || 0) * goalMult)
  const monthSeries = dailyKcalSeries(diario, monthKeys)

  function commitDiario(next) {
    setDiario(next)
    saveDiario(next)
  }

  function saveFood(meal, food) {
    const list = meals[meal]
    const exists = list.some(f => f.id === food.id)
    const nextList = exists ? list.map(f => (f.id === food.id ? food : f)) : [...list, food]
    commitDiario({ ...diario, [key]: { ...meals, [meal]: nextList } })
    setEditing(null)
  }

  function removeFood(meal, id) {
    commitDiario({ ...diario, [key]: { ...meals, [meal]: meals[meal].filter(f => f.id !== id) } })
    setDeleting(null)
  }

  function saveGoals(next) {
    setGoals(next)
    saveNutritionGoals(next)
    setEditGoals(false)
  }

  // Cambio tab: chiude gli accordion e TORNA sempre al periodo corrente (oggi).
  function changePeriod(p) {
    setPeriod(p)
    setMacrosOpen(false)
    setOpenWeeks({})
    setSelDate(todayDate())
  }

  // Frecce: navigano per periodo attivo. La settimana salta alla successiva/
  // precedente ritagliata al mese (il giorno dopo la fine / prima dell'inizio).
  function shift(dir) {
    setSelDate(d => {
      if (period === 'weekly') {
        const { start, end } = clippedWeek(d)
        return dir > 0 ? addDays(end, 1) : addDays(start, -1)
      }
      if (period === 'monthly') return new Date(d.getFullYear(), d.getMonth() + dir, 1)
      return addDays(d, dir)
    })
  }

  // Illuminazione transitoria della freccia (click o swipe) col colore accento.
  const [litDir, setLitDir] = useState(null) // 'prev' | 'next' | null
  const touchStartX = useRef(null)
  function flash(dir) {
    setLitDir(dir)
    setTimeout(() => setLitDir(cur => (cur === dir ? null : cur)), 380)
  }
  function go(dir) { // -1 = precedente, +1 = successivo
    flash(dir < 0 ? 'prev' : 'next')
    shift(dir)
  }
  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (touchStartX.current == null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) go(diff > 0 ? 1 : -1) // swipe sx → succ, dx → prec
    touchStartX.current = null
  }

  const now = todayDate()
  const isCurrentMonth = selDate.getMonth() === now.getMonth() && selDate.getFullYear() === now.getFullYear()
  const week = clippedWeek(selDate)
  const kcalRing = [{ id: 'kcal', current: Math.round(periodTotals.kcal), target: kcalTarget || 1, color: 'var(--accent)', label: t('nutrition.kcal') }]
  const dateLabel = selDate.toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'long' })
  const weekLabel = t('nutrition.weekLabel', { n: weekOfMonth(selDate), month: selDate.toLocaleDateString(lang, { month: 'long' }) })
  const weekRangeLabel = t('nutrition.weekRange', { from: week.start.getDate(), to: week.end.getDate() })
  const monthLabel = selDate.toLocaleDateString(lang, { month: 'long', year: 'numeric' })
  // Animazione di cambio periodo: direzionale su freccia/swipe, fade sul cambio tab.
  const animClass = litDir === 'prev' ? 'nut-in-left' : litDir === 'next' ? 'nut-in-right' : 'nut-fade'

  return (
    <div className="flex flex-col pb-28">
      <TopBar icon={IoRestaurant} title={t('title.nutrition')} />

      {/* Intestazione periodo (solo etichetta; frecce e swipe stanno nella scheda sotto) */}
      <div className="flex justify-center px-5 pt-4">
        <div className="flex flex-col items-center text-center">
          {period === 'daily' && (
            <>
              {isToday && (
                <span className="text-[10px] uppercase tracking-widest font-bold text-[color:var(--accent)]">{t('nutrition.today')}</span>
              )}
              <span className="font-bold capitalize">{dateLabel}</span>
            </>
          )}
          {period === 'weekly' && (
            <>
              <span className="text-[10px] capitalize tracking-wide font-bold text-[color:var(--accent)]">{weekLabel}</span>
              <span className="font-bold capitalize">{weekRangeLabel}</span>
            </>
          )}
          {period === 'monthly' && (
            <>
              {isCurrentMonth && (
                <span className="text-[10px] uppercase tracking-widest font-bold text-[color:var(--accent)]">{t('nutrition.current')}</span>
              )}
              <span className="font-bold capitalize">{monthLabel}</span>
            </>
          )}
        </div>
      </div>

      {/* Riepilogo periodo: tab + navigazione (frecce fisse + swipe) + accordion.
          Le frecce sono ancorate all'anello/grafico: aprendo gli accordion non si muovono. */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="mx-5 mt-4 rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-4"
      >
        {/* Tab periodo a larghezza piena (il tasto obiettivi è stato rimosso: andrà in Impostazioni) */}
        <div className="grid grid-cols-3 gap-1 bg-[var(--surface-2)] rounded-xl p-1 mb-3">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => changePeriod(p.key)}
              className="py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={period === p.key ? { backgroundColor: 'var(--accent)', color: 'var(--on-accent)' } : { color: 'var(--text-dim)' }}
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>

        {/* Zona navigabile: frecce FISSE (ancorate qui) + contenuto animato al cambio */}
        <div className="relative">
          <button
            onClick={() => go(-1)}
            aria-label="−1"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 transition-colors"
            style={{ color: litDir === 'prev' ? 'var(--accent)' : 'var(--text-faint)' }}
          >
            <IoChevronBack className="text-xl" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="+1"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 transition-colors"
            style={{ color: litDir === 'next' ? 'var(--accent)' : 'var(--text-faint)' }}
          >
            <IoChevronForward className="text-xl" />
          </button>

          <div key={`${period}-${key}`} className={animClass}>
            {period === 'monthly' ? (
              <div className="mb-1">
                <NutritionTrendChart values={monthSeries} goal={goals.kcal} unit={t('nutrition.kcal')} />
                <p className="text-center text-sm mt-2">
                  <span className="font-extrabold tabular-nums">{Math.round(periodTotals.kcal)}</span>
                  <span className="text-[color:var(--text-dim)]"> {t('nutrition.kcal')} · {t('nutrition.monthlyTrend')}</span>
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <RingChart rings={kcalRing} />
                <div className="-mt-2 mb-1">
                  <span className="text-xl font-extrabold tabular-nums">{Math.round(periodTotals.kcal)}</span>
                  <span className="text-[color:var(--text-dim)] text-sm"> / {kcalTarget} {t('nutrition.kcal')}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Accordion: singolo Macro-nutrienti (giorno/settimana) o uno per settimana (mese) */}
        {period === 'monthly' ? (
          monthWeeks(selDate).map((w, i) => {
            const keys = weekDateKeys(w.start)
            const title = `${t('nutrition.weekShort', { n: i + 1 })} · ${t('nutrition.weekRange', { from: w.start.getDate(), to: w.end.getDate() })}`
            return (
              <MacroAccordion
                key={i}
                title={title}
                open={!!openWeeks[i]}
                onToggle={() => setOpenWeeks(o => ({ ...o, [i]: !o[i] }))}
                totals={rangeTotals(diario, keys)}
                goals={goals}
                mult={keys.length}
              />
            )
          })
        ) : (
          <MacroAccordion
            title={t('nutrition.macros')}
            open={macrosOpen}
            onToggle={() => setMacrosOpen(o => !o)}
            totals={periodTotals}
            goals={goals}
            mult={goalMult}
          />
        )}
      </div>

      {/* Pasti del giorno */}
      <div className="px-5 mt-5 flex flex-col gap-4">
        {MEALS.map(meal => {
          const list = meals[meal.key]
          const mealKcal = sumNutrients(list).kcal
          return (
            <section key={meal.key}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-baseline gap-2">
                  <h3 className="font-bold">{t(meal.labelKey)}</h3>
                  <span className="text-xs text-[color:var(--text-dim)] tabular-nums">{mealKcal} {t('nutrition.kcal')}</span>
                </div>
                <button
                  onClick={() => setEditing({ meal: meal.key, food: newFood() })}
                  aria-label={t('nutrition.addFood')}
                  className="w-8 h-8 flex items-center justify-center rounded-full"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
                >
                  <IoAdd className="text-xl" />
                </button>
              </div>

              {list.length === 0 ? (
                <p className="text-[color:var(--text-faint)] text-sm py-1">{t('nutrition.noFoods')}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {list.map(food => (
                    <div key={food.id} className="flex items-center gap-3 rounded-xl bg-[var(--surface)] border border-[color:var(--border-1)] px-3 py-2.5">
                      <button onClick={() => setEditing({ meal: meal.key, food })} className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium truncate">{food.nome}</p>
                        {food.grammi ? <p className="text-xs text-[color:var(--text-dim)]">{food.grammi} g</p> : null}
                      </button>
                      <span className="text-sm font-bold tabular-nums shrink-0">
                        {Number(food.kcal) || 0}
                        <span className="text-[color:var(--text-dim)] font-normal text-xs"> {t('nutrition.kcal')}</span>
                      </span>
                      <button
                        onClick={() => setDeleting({ meal: meal.key, food })}
                        aria-label={t('nutrition.deleteFood')}
                        className="text-[color:var(--text-faint)] hover:text-red-400 transition-colors shrink-0"
                      >
                        <IoTrashOutline className="text-lg" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {editing && (
        <FoodEditor
          key={editing.food.id}
          food={editing.food}
          onSave={food => saveFood(editing.meal, food)}
          onCancel={() => setEditing(null)}
        />
      )}

      {editGoals && (
        <NutritionGoalsEditor goals={goals} onSave={saveGoals} onCancel={() => setEditGoals(false)} />
      )}

      {deleting && (
        <ConfirmModal
          title={t('nutrition.deleteFood')}
          message={deleting.food.nome}
          confirmLabel={t('common.yes')}
          cancelLabel={t('common.no')}
          danger
          onConfirm={() => removeFood(deleting.meal, deleting.food.id)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

export default Alimentazione
