import { useNavigate } from 'react-router-dom'
import { IoCheckmark } from 'react-icons/io5'
import TopBar from '../components/TopBar'
import { useLang } from '../context/LanguageContext'

function ImpostazioniLingua() {
  const navigate = useNavigate()
  const { lang, setLang, languages, t } = useLang()

  return (
    <div className="flex flex-col pb-28">
      <TopBar title={t('title.language')} onBack={() => navigate('/profilo')} />

      <div className="px-5 pt-5">
        <h2 className="text-2xl font-extrabold mb-1">{t('settings.language.title')}</h2>
        <p className="text-[color:var(--text-muted)] text-sm mb-5">{t('language.subtitle')}</p>

        <div className="flex flex-col gap-2">
          {languages.map(l => {
            const active = lang === l.code
            return (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className="bg-[var(--surface)] rounded-xl p-4 flex items-center gap-3 w-full text-left transition-colors"
                style={active ? { boxShadow: 'inset 0 0 0 2px var(--accent)' } : undefined}
              >
                <span className="text-2xl shrink-0">{l.flag}</span>
                <span className="flex-1 font-semibold text-sm">{l.label}</span>
                {active && (
                  <IoCheckmark className="text-xl shrink-0" style={{ color: 'var(--accent)' }} />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ImpostazioniLingua
