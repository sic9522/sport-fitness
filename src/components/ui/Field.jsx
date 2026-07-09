// Input etichettato condiviso (login, wizard registrazione, ecc.).
// Passa tutte le props native all'<input> (type, value, onChange, autoComplete…)
// e mostra un eventuale messaggio di errore sotto il campo.
function Field({ label, error, className = '', ...inputProps }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">{label}</span>
      )}
      <input
        {...inputProps}
        className={`w-full bg-[var(--surface)] border rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] placeholder:text-[color:var(--text-faint)] ${
          error ? 'border-red-400' : 'border-[color:var(--border-2)]'
        }`}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  )
}

export default Field
