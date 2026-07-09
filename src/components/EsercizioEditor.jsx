import { useState, useEffect, useRef } from 'react'
import { IoClose, IoBarbellOutline } from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'
import useScrollLock from '../hooks/useScrollLock'
import { titleCase } from '../utils/text'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { searchCatalogExercises } from '../services/catalogs'
import ExerciseImageField from './ExerciseImageField'

// Campo etichettato dell'editor esercizio (numerici)
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

// Campo Nome con autocomplete dal catalogo esercizi (Supabase).
// Digitando >= 2 caratteri interroga catalog_exercises; al clic su un risultato
// chiama onPick(item) col nome e la foto. Se Supabase non è configurato il campo
// resta un normale input (digiti a mano), senza errori.
function NameField({ label, value, placeholder, onChange, onPick }) {
  const { t, lang } = useLang()
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState(false) // cerca solo dopo che l'utente digita
  const boxRef = useRef(null)

  const query = value.trim()

  // Ricerca con debounce (250ms). Ignora risposte obsolete via flag `alive`.
  // Niente setState sincrono nel corpo dell'effetto: il loading si accende
  // nell'onChange dell'input e si spegne qui al termine della richiesta.
  useEffect(() => {
    if (!isSupabaseConfigured || !touched || query.length < 2) return
    let alive = true
    const id = setTimeout(async () => {
      try {
        const data = await searchCatalogExercises(query, { limit: 8, locale: lang })
        if (alive) { setResults(data); setOpen(true) }
      } catch {
        if (alive) setResults([])
      } finally {
        if (alive) setLoading(false)
      }
    }, 250)
    return () => { alive = false; clearTimeout(id) }
  }, [query, touched, lang])

  // Chiude la tendina cliccando fuori dal campo.
  useEffect(() => {
    function onDocDown(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDocDown)
    return () => document.removeEventListener('pointerdown', onDocDown)
  }, [])

  function pick(item) {
    onPick(item)
    setOpen(false)
    setResults([])
    setTouched(false)
  }

  const showDropdown = open && isSupabaseConfigured && query.length >= 2

  return (
    <div className="relative" ref={boxRef}>
      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">{label}</span>
        <input
          value={value}
          onChange={e => {
            const v = e.target.value
            setTouched(true)
            setOpen(true)
            if (isSupabaseConfigured && v.trim().length >= 2) setLoading(true)
            onChange(v)
          }}
          onFocus={() => { if (results.length) setOpen(true) }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-[var(--surface-2)] rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] placeholder:text-[color:var(--text-faint)]"
        />
      </label>

      {showDropdown && (
        <ul className="absolute z-10 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg bg-[var(--surface-2)] border border-[color:var(--border-2)] shadow-xl">
          {loading && results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-[color:var(--text-dim)]">{t('esercizio.searching')}</li>
          ) : results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-[color:var(--text-dim)]">{t('esercizio.noResults')}</li>
          ) : (
            results.map(item => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => pick(item)}
                  className="w-full flex items-center gap-2 px-2 py-2 text-left hover:bg-[var(--fill-1)] transition-colors"
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt=""
                      loading="lazy"
                      className="w-9 h-9 rounded object-cover bg-[var(--fill-1)] shrink-0"
                    />
                  ) : (
                    <span className="w-9 h-9 rounded bg-[var(--fill-1)] flex items-center justify-center shrink-0">
                      <IoBarbellOutline className="text-[color:var(--text-dim)]" />
                    </span>
                  )}
                  <span className="text-sm truncate">{item.name}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
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

        {/* Immagine esercizio: dal catalogo o placeholder, sempre sostituibile */}
        <div className="mt-8 mb-4">
          <ExerciseImageField foto={form.foto} alt={form.titolo} onChange={url => set({ foto: url })} />
        </div>

        <div className="flex flex-col gap-3">
          <NameField
            label={t('goals.name')}
            value={form.titolo}
            placeholder={t('esercizio.namePlaceholder')}
            onChange={v => set({ titolo: v })}
            onPick={item => set({ titolo: item.name, foto: item.image_url || null })}
          />
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
            onClick={() => valid && onSave({ ...form, titolo: titleCase(form.titolo.trim()) })}
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
