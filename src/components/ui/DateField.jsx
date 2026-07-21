import { useState, useRef, useEffect, useMemo } from 'react'
import { IoCalendarOutline, IoChevronDown } from 'react-icons/io5'
import { useLang } from '../../context/LanguageContext'
import Wheel from '../Wheel'
import { daysInMonth, clampDay, toISODate, fromISODate } from '../../utils/date'

// Selettore di data nello stile del mockup Stitch "Add Meal": un campo che apre un
// popover con le ruote, invece dell'input date nativo (che su ogni browser ha un aspetto
// diverso e su desktop apre un calendario fuori dal linguaggio visivo dell'app).
// Tre colonne: giorno, mese, anno. Il valore resta 'YYYY-MM-DD', come l'input nativo,
// quindi chi lo usa non cambia.
function DateField({ label, value, onChange, error, minYear, maxYear, placeholder }) {
  const { t, lang } = useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const parsed = fromISODate(value)
  // Senza valore le ruote partono da una data di riferimento sensata (il centro
  // dell'intervallo), ma NON si scrive nulla finché l'utente non sceglie.
  const yearTo = maxYear ?? new Date().getFullYear()
  const yearFrom = minYear ?? yearTo - 100
  const draft = parsed || { year: Math.round((yearFrom + yearTo) / 2), month: 1, day: 1 }

  useEffect(() => {
    if (!open) return undefined
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Nomi dei mesi nella lingua attiva. Date fisse: nessuna lettura dell'orologio.
  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({
      value: i + 1,
      label: new Date(2000, i, 1).toLocaleDateString(lang, { month: 'long' }),
    })),
    [lang],
  )

  const years = useMemo(
    () => Array.from({ length: yearTo - yearFrom + 1 }, (_, i) => {
      const y = yearTo - i // dal più recente: per una data di nascita si scorre indietro
      return { value: y, label: String(y) }
    }),
    [yearFrom, yearTo],
  )

  const days = useMemo(
    () => Array.from({ length: daysInMonth(draft.year, draft.month) }, (_, i) => ({
      value: i + 1,
      label: String(i + 1),
    })),
    [draft.year, draft.month],
  )

  // Ogni modifica riscrive la data intera, con il giorno ricondotto dentro il mese:
  // passando da 31 gennaio a febbraio si ottiene il 28 (o 29), non una data inesistente.
  function pick(part, v) {
    const next = { ...draft, [part]: v }
    onChange(toISODate(next.year, next.month, clampDay(next.year, next.month, next.day)))
  }

  const shown = parsed
    ? new Date(parsed.year, parsed.month - 1, parsed.day)
      .toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  return (
    <div className="flex flex-col gap-1" ref={ref}>
      <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">{label}</span>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className={`w-full flex items-center gap-2 bg-[var(--surface)] border rounded-xl px-4 py-3 text-sm text-left outline-none focus:ring-1 focus:ring-[var(--accent)] ${
            error ? 'border-red-400' : 'border-[color:var(--border-2)]'
          }`}
        >
          <IoCalendarOutline className="shrink-0 text-base" style={{ color: 'var(--accent)' }} />
          <span className={`flex-1 truncate ${shown ? '' : 'text-[color:var(--text-faint)]'}`}>
            {shown || placeholder || t('date.choose')}
          </span>
          <IoChevronDown className={`shrink-0 text-[color:var(--text-dim)] transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl bg-[var(--surface)] border border-[color:var(--border-2)] shadow-xl p-2">
            <div className="flex items-start justify-center gap-1">
              <Wheel options={days} value={draft.day} onChange={v => pick('day', v)} visible={5} itemH={34} width={64} scrollbar={8} />
              <Wheel options={months} value={draft.month} onChange={v => pick('month', v)} visible={5} itemH={34} width={116} scrollbar={8} />
              <Wheel options={years} value={draft.year} onChange={v => pick('year', v)} visible={5} itemH={34} width={80} scrollbar={8} />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 w-full rounded-full py-2 text-sm font-bold"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              {t('common.confirm')}
            </button>
          </div>
        )}
      </div>

      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}

export default DateField
