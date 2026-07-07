import { useEffect } from 'react'
import useScrollLock from '../hooks/useScrollLock'

// Modale di conferma generica (stile coerente con l'app). Riusabile per qualsiasi
// azione che richieda un "sei sicuro?". Click esterno o Esc = annulla.
function ConfirmModal({ title, message, confirmLabel, cancelLabel, danger, onConfirm, onCancel }) {
  useScrollLock()
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-[var(--surface)] border border-[color:var(--border-2)] p-5"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-bold text-lg">{title}</h3>
        {message && <p className="text-[color:var(--text-muted)] text-sm mt-2">{message}</p>}
        <div className="flex gap-2 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl py-3 font-semibold bg-[var(--surface-3)] text-[color:var(--text)] hover:opacity-90 transition-opacity"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl py-3 font-semibold hover:opacity-90 transition-opacity"
            style={danger ? { backgroundColor: '#ef4444', color: '#fff' } : { backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
