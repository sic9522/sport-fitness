import { useState, useEffect } from 'react'
import useScrollLock from '../hooks/useScrollLock'

// Modale con un campo di testo (nome). Conferma disabilitata se vuoto.
// Click esterno / Esc = annulla; Enter = conferma. Riusabile.
function PromptModal({ title, placeholder, confirmLabel, cancelLabel, onConfirm, onCancel }) {
  useScrollLock()
  const [value, setValue] = useState('')

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  const valid = value.trim() !== ''
  function submit() {
    if (valid) onConfirm(value.trim())
  }

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
        <input
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          placeholder={placeholder}
          className="w-full rounded-xl bg-[var(--surface-2)] border border-[color:var(--border-2)] px-3 py-2.5 text-sm text-[color:var(--text)] outline-none focus:border-[color:var(--border-4)] placeholder:text-[color:var(--text-faint)]"
        />
        <div className="flex gap-2 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl py-3 font-semibold bg-[var(--surface-3)] text-[color:var(--text)] hover:opacity-90 transition-opacity"
          >
            {cancelLabel}
          </button>
          <button
            onClick={submit}
            disabled={!valid}
            className="flex-1 rounded-xl py-3 font-semibold disabled:opacity-30 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PromptModal
