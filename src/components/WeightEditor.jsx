import { useState } from 'react'
import { IoClose } from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'
import useScrollLock from '../hooks/useScrollLock'
import Field from './ui/Field'
import { isPositiveNumber, isNonEmpty } from '../utils/validators'

// Editor di una misura di peso (nuova o esistente). Lavora su una copia locale
// (`form`); si applica solo con Salva. Data e kg (> 0) obbligatori.
function WeightEditor({ entry, onSave, onCancel }) {
  const { t } = useLang()
  useScrollLock()
  const [form, setForm] = useState(entry)
  const set = patch => setForm(f => ({ ...f, ...patch }))

  const valid = isNonEmpty(form.date) && isPositiveNumber(form.kg)

  function save() {
    if (!valid) return
    onSave({ ...form, kg: Number(form.kg) })
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
          {t('weight.newTitle')}
        </h3>

        <div className="flex flex-col gap-3">
          <Field
            label={t('weight.dateLabel')}
            type="date"
            value={form.date}
            onChange={e => set({ date: e.target.value })}
          />
          <Field
            label={`${t('weight.valueLabel')} (${t('weight.kg')})`}
            value={form.kg}
            onChange={e => set({ kg: e.target.value })}
            inputMode="decimal"
            placeholder="70"
          />
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

export default WeightEditor
