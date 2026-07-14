import { useState, useEffect, useRef } from 'react'
import { IoClose, IoBarbellOutline, IoChevronDown } from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'
import useScrollLock from '../hooks/useScrollLock'
import { titleCase } from '../utils/text'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { searchCatalogExercises } from '../services/catalogs'
import { serieCount, editorRows, rowsValid, buildExercise, SERIE_MAX } from '../data/exerciseSets'
import ExerciseImageField from './ExerciseImageField'

// Campo etichettato dell'editor esercizio (numerici). La label è opzionale:
// nelle righe multiple (split) l'intestazione è unica sopra, non per riga.
function Field({ label, value, onChange, inputMode, placeholder }) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">{label}</span>}
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

// Select custom del numero di serie (1-5). Diversa da una <select> nativa perché
// il menu contiene, in alto a destra, un radio "split" che attiva le righe per-serie.
function SerieSelect({ serie, split, onSerie, onToggleSplit }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  return (
    <div className="relative w-16 shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full bg-[var(--surface-2)] rounded-lg px-3 py-2 text-sm flex items-center justify-between outline-none focus:ring-1 focus:ring-[var(--accent)]"
      >
        <span className="font-semibold tabular-nums">{serie}</span>
        <IoChevronDown className="text-xs text-[color:var(--text-dim)]" />
      </button>

      {open && (
        <div className="absolute z-20 left-0 mt-1 w-44 rounded-lg bg-[var(--surface-2)] border border-[color:var(--border-2)] shadow-xl p-2">
          {/* Intestazione: etichetta + radio "split" in alto a destra */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-[color:var(--text-dim)]">{t('esercizio.serie')}</span>
            <button type="button" onClick={onToggleSplit} aria-pressed={split} className="flex items-center gap-1.5">
              <span className="text-xs">{t('esercizio.split')}</span>
              <span
                className="w-4 h-4 rounded-full border flex items-center justify-center"
                style={{ borderColor: split ? 'var(--accent)' : 'var(--border-3)' }}
              >
                {split && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />}
              </span>
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: SERIE_MAX }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                type="button"
                onClick={() => { onSerie(n); setOpen(false) }}
                className="py-1.5 rounded text-sm font-semibold tabular-nums transition-colors"
                style={n === serie ? { backgroundColor: 'var(--accent)', color: 'var(--on-accent)' } : { color: 'var(--text-dim)' }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
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
  const [form, setForm] = useState(esercizio) // titolo, foto, stato, id
  const set = patch => setForm(f => ({ ...f, ...patch }))

  // Serie (1-5), split e righe reps/kg gestite a parte dal resto del form.
  const [serie, setSerie] = useState(() => serieCount(esercizio))
  const [split, setSplit] = useState(() => Boolean(esercizio.split))
  const [rows, setRows] = useState(() => editorRows(esercizio))

  const emptyRow = { reps: '', kg: '' }

  // Cambio numero serie: con split cresce/riduce le righe (le nuove copiano l'ultima).
  function changeSerie(n) {
    if (split) {
      const next = rows.slice(0, n)
      while (next.length < n) next.push({ ...(rows[rows.length - 1] || emptyRow) })
      setRows(next)
    }
    setSerie(n)
  }

  // Split ON: espande la riga unica in N righe uguali. OFF: torna a una sola riga.
  function toggleSplit() {
    const ns = !split
    if (ns) {
      const base = rows[0] || emptyRow
      setRows(Array.from({ length: serie }, () => ({ ...base })))
    } else {
      setRows([rows[0] || emptyRow])
    }
    setSplit(ns)
  }

  const setRow = (i, patch) => setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const valid = form.titolo.trim() !== '' && rowsValid(rows)

  function save() {
    if (!valid) return
    const ex = buildExercise(form, { serie, split, rows })
    onSave({ ...ex, titolo: titleCase(form.titolo.trim()) })
  }

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
          {/* Serie (select con split) a sinistra + righe reps/kg a destra.
              items-center centra verticalmente la select rispetto alle righe:
              2 righe → tra la 1ª e la 2ª; 3 → sulla 2ª; 4 → tra 2ª e 3ª; 5 → sulla 3ª. */}
          <div>
            <div className="flex gap-3 mb-1">
              <span className="w-16 shrink-0 text-xs uppercase tracking-wider text-[color:var(--text-dim)]">{t('esercizio.serie')}</span>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">{t('esercizio.reps')}</span>
                <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">kg</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <SerieSelect serie={serie} split={split} onSerie={changeSerie} onToggleSplit={toggleSplit} />
              <div className="flex-1 flex flex-col gap-2">
                {rows.map((r, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <Field value={r.reps} onChange={v => setRow(i, { reps: v })} inputMode="numeric" placeholder="8" />
                    <Field value={r.kg} onChange={v => setRow(i, { kg: v })} inputMode="numeric" placeholder="20" />
                  </div>
                ))}
              </div>
            </div>
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

export default EsercizioEditor
