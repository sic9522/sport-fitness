import { NavLink } from 'react-router-dom'
import {
  IoHomeOutline, IoHome,
  IoRestaurantOutline, IoRestaurant,
  IoStopwatchOutline, IoStopwatch,
  IoBarbell,
  IoSettingsOutline, IoSettings,
} from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'

const navItems = [
  { labelKey: 'nav.palestra',      icon: IoBarbell,           activeIcon: IoBarbell,     path: '/palestra' },
  { labelKey: 'nav.alimentazione', icon: IoRestaurantOutline, activeIcon: IoRestaurant,  path: '/alimentazione' },
  { labelKey: 'nav.home',          icon: IoHomeOutline,       activeIcon: IoHome,        path: '/',             end: true },
  { labelKey: 'nav.timer',         icon: IoStopwatchOutline,  activeIcon: IoStopwatch,   path: '/timer' },
  { labelKey: 'nav.impostazioni',  icon: IoSettingsOutline,   activeIcon: IoSettings,    path: '/impostazioni' },
]

function Footer() {
  const { t } = useLang()
  return (
    <div
      className="fixed bottom-4 left-4 right-4 max-w-[390px] mx-auto backdrop-blur-md border border-[color:var(--border-1)] rounded-2xl flex justify-around items-center py-3 px-1"
      // color-mix mantiene l'effetto semi-trasparente (70%) anche con un colore custom
      style={{ backgroundColor: 'color-mix(in srgb, var(--navbar) 70%, transparent)' }}
    >
      {navItems.map(({ labelKey, icon: Icon, activeIcon: ActiveIcon, path, end }) => (
        <NavLink
          key={path}
          to={path}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
              isActive ? 'text-[var(--accent)]' : 'text-[color:var(--text-dim)]'
            }`
          }
        >
          {({ isActive }) => {
            const Component = isActive ? ActiveIcon : Icon
            return (
              <>
                <Component className="text-xl" />
                <span>{t(labelKey)}</span>
              </>
            )
          }}
        </NavLink>
      ))}
    </div>
  )
}

export default Footer
