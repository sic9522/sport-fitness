import { useState } from 'react'
import { IoClose } from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'
import useScrollLock from '../hooks/useScrollLock'
import { titleCase } from '../utils/text'
import Field from './ui/Field'

// Editor di un alimento (nuovo o esistente). Lavora su una copia locale (`form`):
// si applica solo con Salva; Annulla o X scartano. Nome e kcal sono obbligatori;
// grammi e macro sono opzionali (vuoto = 0 nei totali).
function FoodEditor({ food, onSave, onCancel }) {
  const { t } = useLang()
  useScrollLock()
  const [form, setForm] = useState(food)
  const set = patch => setForm(f => ({ ...f, ...patch }))

  const valid = form.nome.trim() !== '' && String(form.kcal).trim() !== ''

  function save() {
    if (!valid) return
    onSave({ ...form, nome: titleCase(form.nome.trim()) })
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
          {t('nutrition.addFood')}
        </h3>

        <div className="flex flex-col gap-3">
          <Field
            label={t('goals.name')}
            value={form.nome}
            onChange={e => set({ nome: e.target.value })}
            placeholder={t('nutrition.foodNamePlaceholder')}
            autoComplete="off"
          />
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('nutrition.grams')} value={form.grammi} onChange={e => set({ grammi: e.target.value })} inputMode="numeric" placeholder="100" />
            <Field label={t('nutrition.kcal')} value={form.kcal} onChange={e => set({ kcal: e.target.value })} inputMode="numeric" placeholder="0" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label={t('nutrition.proteinShort')} value={form.protein} onChange={e => set({ protein: e.target.value })} inputMode="numeric" placeholder="0" />
            <Field label={t('nutrition.carbsShort')} value={form.carbs} onChange={e => set({ carbs: e.target.value })} inputMode="numeric" placeholder="0" />
            <Field label={t('nutrition.fatShort')} value={form.fat} onChange={e => set({ fat: e.target.value })} inputMode="numeric" placeholder="0" />
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
            disabled={!valid}
            className="flex-1 rounded-xl py-3 font-semibold text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            style={{ backgroundColor: '#3b82f6' }}
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default FoodEditor
