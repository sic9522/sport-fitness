import { useState } from 'react'
import { IoClose } from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'
import useScrollLock from '../hooks/useScrollLock'
import Field from './ui/Field'

// Modale per modificare gli obiettivi nutrizionali del giorno (kcal + P/C/G).
// Copia locale applicata solo con Salva. I campi vuoti tornano a 0.
function NutritionGoalsEditor({ goals, onSave, onCancel }) {
  const { t } = useLang()
  useScrollLock()
  const [form, setForm] = useState(goals)
  const set = patch => setForm(f => ({ ...f, ...patch }))

  const num = v => Math.max(0, Math.round(Number(v) || 0))

  function save() {
    onSave({
      kcal: num(form.kcal),
      protein: num(form.protein),
      carbs: num(form.carbs),
      fat: num(form.fat),
    })
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

        <h3 className="text-sm font-bold uppercase tracking-widest text-[color:var(--text-dim)] mt-1 mb-4">
          {t('nutrition.dayGoals')}
        </h3>

        <div className="flex flex-col gap-3">
          <Field label={t('nutrition.kcal')} value={form.kcal} onChange={e => set({ kcal: e.target.value })} inputMode="numeric" placeholder="2000" />
          <div className="grid grid-cols-3 gap-2">
            <Field label={`${t('nutrition.proteinShort')} (g)`} value={form.protein} onChange={e => set({ protein: e.target.value })} inputMode="numeric" placeholder="150" />
            <Field label={`${t('nutrition.carbsShort')} (g)`} value={form.carbs} onChange={e => set({ carbs: e.target.value })} inputMode="numeric" placeholder="220" />
            <Field label={`${t('nutrition.fatShort')} (g)`} value={form.fat} onChange={e => set({ fat: e.target.value })} inputMode="numeric" placeholder="60" />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl py-3 font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#ef4444' }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={save}
            className="flex-1 rounded-xl py-3 font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#3b82f6' }}
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default NutritionGoalsEditor
