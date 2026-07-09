import { useState, useEffect } from 'react'
import { IoSearchOutline, IoStarOutline } from 'react-icons/io5'
import useScrollLock from '../hooks/useScrollLock'
import { useLang } from '../context/LanguageContext'
import { giornataName } from '../data/giornateDefaults'

// Modale di scelta destinazione: elenco delle giornate con barra di ricerca.
// onPick(id) seleziona la giornata; Esc / click esterno = annulla.
// Opzionale: topLevelLabel + onPickTopLevel per una destinazione speciale (sezione Personalizzate).
function GiornataPickerModal({ title, giornate, onPick, onCancel, topLevelLabel, onPickTopLevel }) {
  useScrollLock()
  const { t } = useLang()
  const [q, setQ] = useState('')

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  const query = q.trim().toLowerCase()
  const list = query
    ? giornate.filter(g => giornataName(g, t).toLowerCase().includes(query))
    : giornate

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-[var(--surface)] border border-[color:var(--border-2)] p-5"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-bold text-lg mb-3">{title}</h3>

        <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-2)] border border-[color:var(--border-2)] px-3 mb-3">
          <IoSearchOutline className="text-[color:var(--text-dim)] shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t('move.search')}
            className="flex-1 bg-transparent py-2.5 text-sm text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-faint)]"
          />
        </div>

        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          {topLevelLabel && (
            <button
              onClick={onPickTopLevel}
              className="w-full text-left rounded-xl px-3 py-2.5 hover:bg-[var(--surface-3)] transition-colors flex items-center gap-2"
              style={{ color: 'var(--accent)' }}
            >
              <IoStarOutline className="shrink-0" />
              <span className="text-sm font-semibold truncate">{topLevelLabel}</span>
            </button>
          )}
          {list.length === 0 && !topLevelLabel ? (
            <p className="text-[color:var(--text-dim)] text-sm text-center py-6">{t('move.empty')}</p>
          ) : (
            list.map(g => (
              <button
                key={g.id}
                onClick={() => onPick(g.id)}
                className="w-full text-left rounded-xl px-3 py-2.5 hover:bg-[var(--surface-3)] transition-colors flex items-center justify-between gap-2"
              >
                <span className="text-sm font-medium truncate">{giornataName(g, t)}</span>
                <span className="text-[10px] text-[color:var(--text-faint)] shrink-0">
                  {t('palestra.schede', { count: g.schede.length })}
                </span>
              </button>
            ))
          )}
        </div>

        <button
          onClick={onCancel}
          className="w-full mt-4 rounded-xl py-3 font-semibold bg-[var(--surface-3)] text-[color:var(--text)] hover:opacity-90 transition-opacity"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}

export default GiornataPickerModal
