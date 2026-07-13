import { useNavigate } from 'react-router-dom'
import { IoSettings, IoColorPaletteOutline, IoFlagOutline, IoLanguageOutline, IoArchiveOutline, IoChevronForward } from 'react-icons/io5'
import TopBar from '../components/TopBar'
import { useLang } from '../context/LanguageContext'

const MENU_ITEMS = [
  {
    path: '/impostazioni/colori',
    icon: IoColorPaletteOutline,
    titleKey: 'settings.colors.title',
    descKey: 'settings.colors.desc',
  },
  {
    path: '/impostazioni/obiettivi',
    icon: IoFlagOutline,
    titleKey: 'settings.goals.title',
    descKey: 'settings.goals.desc',
  },
  {
    path: '/impostazioni/lingua',
    icon: IoLanguageOutline,
    titleKey: 'settings.language.title',
    descKey: 'settings.language.desc',
  },
  {
    path: '/impostazioni/backup',
    icon: IoArchiveOutline,
    titleKey: 'settings.backup.title',
    descKey: 'settings.backup.desc',
  },
]

function Impostazioni() {
  const navigate = useNavigate()
  const { t } = useLang()

  return (
    <div className="flex flex-col pb-28">
      <TopBar icon={IoSettings} title={t('title.settings')} />

      <div className="px-5 pt-5">
        <h2 className="text-2xl font-extrabold mb-1">{t('settings.h2')}</h2>
        <p className="text-[color:var(--text-muted)] text-sm mb-6">{t('settings.subtitle')}</p>

        <div className="flex flex-col gap-2">
          {MENU_ITEMS.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="bg-[var(--surface)] rounded-xl p-4 flex items-center gap-4 w-full text-left hover:bg-[var(--surface-3)] transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--fill-1)] flex items-center justify-center shrink-0">
                <item.icon className="text-xl" style={{ color: 'var(--accent)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{t(item.titleKey)}</p>
                <p className="text-[color:var(--text-dim)] text-xs mt-0.5">{t(item.descKey)}</p>
              </div>
              <IoChevronForward className="text-[color:var(--text-faint)] shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Impostazioni
