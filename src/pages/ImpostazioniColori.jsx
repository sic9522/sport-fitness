import { useNavigate } from 'react-router-dom'
import { IoCheckmark, IoMoonOutline, IoSunnyOutline } from 'react-icons/io5'
import TopBar from '../components/TopBar'
import { useLang } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'

const MODES = [
  { id: 'dark', labelKey: 'colors.dark', icon: IoMoonOutline },
  { id: 'light', labelKey: 'colors.light', icon: IoSunnyOutline },
]

// Le superfici neutre sono le stesse per tutte le palette: mostrarle cinque volte non
// direbbe nulla. Il campione riproduce invece l'unica cosa che cambia — l'accento — nel
// contesto in cui si vedra' davvero: un pulsante pieno con il suo testo sopra.
function Swatch({ theme }) {
  return (
    <span
      className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-[11px] font-extrabold"
      style={{ backgroundColor: theme.accent, color: theme.onAccent }}
    >
      Aa
    </span>
  )
}

// Scelta della palette. Niente piu' selettori di colore liberi: erano la causa principale
// dell'incoerenza visiva, perche' permettevano accostamenti che nessun design system
// avrebbe approvato (accento, navbar e sfondo scelti a mano, uno indipendente dall'altro).
// Qui si sceglie fra palette curate, tutte costruite sulla stessa filosofia, piu' la
// modalita' chiara o scura.
function ImpostazioniColori() {
  const { t } = useLang()
  const navigate = useNavigate()
  const { theme, setTheme, themes, mode, setMode } = useTheme()

  return (
    <div className="flex flex-col pb-28">
      <TopBar title={t('title.colors')} onBack={() => navigate('/profilo')} />

      <div className="px-5 pt-5">
        <h2 className="text-xs uppercase tracking-wider text-[color:var(--text-dim)] mb-2 px-1">
          {t('colors.mode')}
        </h2>
        <div className="grid grid-cols-2 gap-1 bg-[var(--surface-2)] rounded-full p-1">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className="flex items-center justify-center gap-2 py-2 rounded-full text-sm font-semibold transition-all"
              style={mode === m.id
                ? { backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }
                : { color: 'var(--text-dim)' }}
            >
              <m.icon className="text-base" />
              {t(m.labelKey)}
            </button>
          ))}
        </div>

        <h2 className="text-xs uppercase tracking-wider text-[color:var(--text-dim)] mt-6 mb-2 px-1">
          {t('colors.palette')}
        </h2>
        <div className="rounded-2xl overflow-hidden border border-[color:var(--border-1)] divide-y divide-[color:var(--border-1)]">
          {themes.map(th => (
            <button
              key={th.id}
              onClick={() => setTheme(th)}
              className="w-full flex items-center gap-3 bg-[var(--surface)] p-4 text-left hover:bg-[var(--surface-3)] transition-colors"
            >
              <Swatch theme={th} />
              <span className="flex-1 min-w-0 font-semibold text-sm truncate">{th.name}</span>
              {th.id === theme.id && (
                <IoCheckmark className="text-xl shrink-0" style={{ color: 'var(--accent)' }} />
              )}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs text-[color:var(--text-faint)] leading-snug">{t('colors.note')}</p>
      </div>
    </div>
  )
}

export default ImpostazioniColori
