import { authProviders } from '../../lib/authProviders'
import { useLang } from '../../context/LanguageContext'

// Bottoni dei metodi di accesso alternativi (numero di telefono, OAuth), generati
// dall'elenco `authProviders`. Condiviso tra login e registrazione: aggiungere un
// provider = aggiungere una voce in authProviders, nessuna modifica qui.
function ProviderButtons({ onSelect, labelKey = 'auth.continueWith', busy = false, selectedId = null }) {
  const { t } = useLang()

  return (
    <div className="flex flex-col gap-2">
      {authProviders.map(p => {
        const Icon = p.icon
        const selected = selectedId === p.id
        // I marchi (Google, GitHub) restano invariati; le voci generiche si traducono.
        const provider = p.labelToken ? t(p.labelToken) : p.label
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            disabled={busy}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold border transition-colors disabled:opacity-50 ${
              selected
                ? 'border-[var(--accent)] bg-[var(--fill-1)]'
                : 'border-[color:var(--border-2)] bg-[var(--surface)] hover:bg-[var(--fill-1)]'
            }`}
          >
            <Icon className="text-lg" />
            {t(labelKey, { provider })}
          </button>
        )
      })}
    </div>
  )
}

export default ProviderButtons
