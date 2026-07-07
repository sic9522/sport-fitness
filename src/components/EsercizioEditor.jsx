import { useState } from 'react'
import { IoClose, IoBarbellOutline } from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'
import useScrollLock from '../hooks/useScrollLock'

// Campo etichettato dell'editor esercizio
function Field({ label, value, onChange, inputMode, placeholder }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        inputMode={inputMode}
        placeholder={placeholder}
        className="w-full bg-[var(--surface-2)] rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] placeholder:text-[color:var(--text-faint)]"
      />
    </label>
  )
}

// Editor di un esercizio (nuovo o esistente). Modifica su una copia locale: si applica
// solo con Salva; Annulla o X scartano. Si esce SOLO da X / Annulla / Salva (no click fuori).
function EsercizioEditor({ esercizio, onSave, onCancel }) {
  const { t } = useLang()
  useScrollLock()
  const [form, setForm] = useState(esercizio)
  const set = patch => setForm(f => ({ ...f, ...patch }))

  // Tutti i campi obbligatori: Salva attivo solo se sono compilati (nome incluso)
  const valid =
    form.titolo.trim() !== '' &&
    String(form.serie).trim() !== '' &&
    String(form.reps).trim() !== '' &&
    String(form.kg).trim() !== ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm"
      onClick={e => e.stopPropagation()}
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[color:var(--border-2)] p-5">
        {/* X: verso l'angolo in alto a destra, staccata dalla foto */}
        <button
          onClick={onCancel}
          aria-label={t('common.cancel')}
          className="absolute top-3 right-3 text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors"
        >
          <IoClose className="text-2xl" />
        </button>

        {/* Foto (placeholder per ora) */}
        <div className="w-full h-32 rounded-xl bg-[var(--fill-1)] flex items-center justify-center mt-8 mb-4">
          <IoBarbellOutline className="text-4xl text-[color:var(--text-dim)]" />
        </div>

        <div className="flex flex-col gap-3">
          <Field label={t('goals.name')} value={form.titolo} onChange={v => set({ titolo: v })} placeholder={t('esercizio.namePlaceholder')} />
          <div className="grid grid-cols-3 gap-2">
            <Field label={t('esercizio.serie')} value={form.serie} onChange={v => set({ serie: v })} inputMode="numeric" placeholder="3" />
            <Field label={t('esercizio.reps')} value={form.reps} onChange={v => set({ reps: v })} inputMode="numeric" placeholder="8" />
            <Field label="kg" value={form.kg} onChange={v => set({ kg: v })} inputMode="numeric" placeholder="20" />
          </div>
        </div>

        {/* Footer: Annulla (rosso) / Salva (blu, disattivato se campi vuoti) */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl py-3 font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#ef4444' }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => valid && onSave(form)}
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

export default EsercizioEditor
