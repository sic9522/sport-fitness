import { useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
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

const DOUBLE_MS = 350 // finestra per il doppio tap sulla stessa voce

function Footer() {
  const { t } = useLang()
  const navigate = useNavigate()
  const lastTap = useRef({ path: null, time: 0 })

  // Doppio tap sulla stessa voce → torna alla pagina principale della sezione
  // (esce dalle sotto-viste, es. scheda aperta in Palestra) e scrolla in cima.
  function handleTap(e, path) {
    const now = e.timeStamp
    const prev = lastTap.current
    lastTap.current = { path, time: now }
    if (prev.path === path && now - prev.time < DOUBLE_MS) {
      window.dispatchEvent(new CustomEvent('fitpulse-navreset', { detail: path }))
      window.scrollTo({ top: 0 })
      navigate(path) // se sei già sulla rotta il NavLink non rinaviga: forza comunque
    }
  }

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
          onClick={e => handleTap(e, path)}
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
