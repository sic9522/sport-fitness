import { useState } from 'react'
import { IoClose } from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'
import useScrollLock from '../hooks/useScrollLock'
import Field from './ui/Field'
import { MEASURE_GROUPS, MEASURE_FIELDS, cleanValues, hasAnyValue } from '../data/bodyMeasuresDefaults'

// Etichetta unità coerente con l'i18n condiviso (kg da weight, cm/% da body).
function unitLabel(unit, t) {
  if (unit === 'kg') return t('weight.kg')
  if (unit === '%') return t('body.pct')
  return t('body.cm')
}

// Editor di uno snapshot di misure (nuovo o esistente). Tutti i campi opzionali,
// ma serve la data e almeno un valore. Numeri come stringhe nel form.
function BodyMeasuresEditor({ entry, onSave, onCancel }) {
  const { t } = useLang()
  useScrollLock()

  const [form, setForm] = useState(() => {
    const values = {}
    for (const f of MEASURE_FIELDS) {
      const v = entry.values?.[f.key]
      values[f.key] = v === undefined || v === null ? '' : String(v)
    }
    return { id: entry.id, date: entry.date, values }
  })

  const setDate = date => setForm(f => ({ ...f, date }))
  const setValue = (key, val) => setForm(f => ({ ...f, values: { ...f.values, [key]: val } }))

  const valid = form.date.trim() !== '' && hasAnyValue(form)

  function save() {
    if (!valid) return
    onSave({ id: form.id, date: form.date, values: cleanValues(form.values) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-2xl bg-[var(--surface)] border border-[color:var(--border-2)] p-5">
        <button
          onClick={onCancel}
          aria-label={t('common.cancel')}
          className="absolute top-3 right-3 text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors"
        >
          <IoClose className="text-2xl" />
        </button>

        <h3 className="text-sm font-bold uppercase tracking-widest text-[color:var(--text-dim)] mt-1 mb-4">
          {t('body.newTitle')}
        </h3>

        <div className="flex flex-col gap-4">
          <Field label={t('body.dateLabel')} type="date" value={form.date} onChange={e => setDate(e.target.value)} />

          {MEASURE_GROUPS.map(group => (
            <div key={group.key}>
              <p className="text-xs uppercase tracking-widest text-[color:var(--text-dim)] mb-2">{t(group.labelKey)}</p>
              <div className="grid grid-cols-2 gap-2">
                {MEASURE_FIELDS.filter(f => f.group === group.key).map(f => (
                  <Field
                    key={f.key}
                    label={`${t(f.labelKey)} (${unitLabel(f.unit, t)})`}
                    value={form.values[f.key]}
                    onChange={e => setValue(f.key, e.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                  />
                ))}
              </div>
            </div>
          ))}
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

export default BodyMeasuresEditor
