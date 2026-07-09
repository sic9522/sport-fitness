import { Link } from 'react-router-dom'
import { IoChevronBack } from 'react-icons/io5'
import UserMenu from './auth/UserMenu'
import ThemePicker from './ThemePicker'
import LanguagePicker from './LanguagePicker'

function TopBar({ icon: Icon, title, onBack, titleLink }) {
  const titleEl = titleLink
    ? <Link to={titleLink} className="font-bold text-sm tracking-widest uppercase">{title}</Link>
    : <span className="font-bold text-sm tracking-widest uppercase">{title}</span>

  return (
    <div
      // full-bleed: esce dalla colonna 390px e occupa tutta la larghezza dello schermo
      className="sticky top-0 z-10 w-screen ml-[calc(50%_-_50vw)] flex items-center justify-between px-5 pt-6 pb-4"
      style={{ backgroundColor: 'var(--navbar)' }}
    >
      {onBack ? (
        <button onClick={onBack} className="text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors">
          <IoChevronBack className="text-2xl" />
        </button>
      ) : (
        Icon && <Icon className="text-2xl" style={{ color: 'var(--accent)' }} />
      )}
      {titleEl}
      <div className="flex items-center gap-2">
        <LanguagePicker />
        <ThemePicker />
        <UserMenu />
      </div>
    </div>
  )
}

export default TopBar
