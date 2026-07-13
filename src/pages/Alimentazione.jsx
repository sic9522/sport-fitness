import { useState } from 'react'
import { IoRestaurant, IoChevronBack, IoChevronForward, IoAdd, IoTrashOutline, IoOptionsOutline } from 'react-icons/io5'
import TopBar from '../components/TopBar'
import RingChart from '../components/RingChart'
import FoodEditor from '../components/FoodEditor'
import NutritionGoalsEditor from '../components/NutritionGoalsEditor'
import ConfirmModal from '../components/ConfirmModal'
import { useLang } from '../context/LanguageContext'
import {
  MEALS, todayDate, addDays, dateKey, todayKey, newFoodId,
  loadDiario, saveDiario, dayMeals, dayTotals, sumNutrients,
  loadNutritionGoals, saveNutritionGoals,
} from '../data/nutritionDefaults'
import { useNutritionSync } from '../hooks/useNutritionSync'

// Macro mostrate come barre nel riepilogo (colori fissi, leggibili in dark/light).
const MACROS = [
  { key: 'protein', labelKey: 'nutrition.proteinShort', color: '#f472b6' },
  { key: 'carbs', labelKey: 'nutrition.carbsShort', color: '#f59e0b' },
  { key: 'fat', labelKey: 'nutrition.fatShort', color: '#38bdf8' },
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

// Bozza di un nuovo alimento (id generato in handler, non in render).
const newFood = () => ({ id: newFoodId(), nome: '', grammi: '', kcal: '', protein: '', carbs: '', fat: '' })

function Alimentazione() {
  const { t, lang } = useLang()

  const [selDate, setSelDate] = useState(todayDate)
  const [diario, setDiario] = useState(loadDiario)
  const [goals, setGoals] = useState(loadNutritionGoals)
  const [editing, setEditing] = useState(null)  // { meal, food } → FoodEditor
  const [deleting, setDeleting] = useState(null) // { meal, food } → ConfirmModal
  const [editGoals, setEditGoals] = useState(false)

  // Ponte local-first: da loggato rispecchia diario e obiettivi su Supabase (no-op se non configurato).
  useNutritionSync(diario, setDiario, goals, setGoals)

  const key = dateKey(selDate)
  const meals = dayMeals(diario, key)
  const totals = dayTotals(meals)
  const isToday = key === todayKey()

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

  const kcalRing = [{ id: 'kcal', current: totals.kcal, target: goals.kcal || 1, color: 'var(--accent)', label: t('nutrition.kcal') }]
  const dateLabel = selDate.toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'long' })

  return (
    <div className="flex flex-col pb-28">
      <TopBar icon={IoRestaurant} title={t('title.nutrition')} />

      {/* Selettore data */}
      <div className="flex items-center justify-between px-5 pt-4">
        <button onClick={() => setSelDate(d => addDays(d, -1))} aria-label="−1" className="p-2 text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors">
          <IoChevronBack className="text-xl" />
        </button>
        <div className="flex flex-col items-center">
          <span className="font-bold capitalize">{dateLabel}</span>
          {isToday && (
            <span className="text-[10px] uppercase tracking-widest font-bold text-[color:var(--accent)]">{t('nutrition.today')}</span>
          )}
        </div>
        <button onClick={() => setSelDate(d => addDays(d, 1))} aria-label="+1" className="p-2 text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors">
          <IoChevronForward className="text-xl" />
        </button>
      </div>

      {/* Riepilogo giornata: anello kcal + barre macro, tutto vs obiettivi */}
      <div className="mx-5 mt-4 rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-dim)]">{t('nutrition.dayGoals')}</p>
          <button onClick={() => setEditGoals(true)} aria-label={t('nutrition.editGoals')} className="text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors">
            <IoOptionsOutline className="text-lg" />
          </button>
        </div>

        <div className="flex flex-col items-center">
          <RingChart rings={kcalRing} />
          <div className="-mt-2 mb-3">
            <span className="text-xl font-extrabold tabular-nums">{totals.kcal}</span>
            <span className="text-[color:var(--text-dim)] text-sm"> / {goals.kcal} {t('nutrition.kcal')}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {MACROS.map(m => (
            <MacroBar key={m.key} label={t(m.labelKey)} value={totals[m.key]} target={goals[m.key]} color={m.color} />
          ))}
        </div>
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
