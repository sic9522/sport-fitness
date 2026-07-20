import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoPersonCircleOutline } from 'react-icons/io5'
import { useAuth } from '../../context/AuthContext'
import { useLang } from '../../context/LanguageContext'
import { signOut } from '../../services/auth'
import LoginModal from './LoginModal'

// Menu utente in alto a destra (icona placeholder).
// - Non autenticato: apre la modale di login.
// - Autenticato: apre un menu a tendina (Profilo / Impostazioni / Esci),
//   struttura gia' pronta per nuove voci future.
function UserMenu() {
  const { user } = useAuth()
  const { t } = useLang()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onDocDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onDocDown)
    return () => document.removeEventListener('pointerdown', onDocDown)
  }, [])

  function onIconClick() {
    if (user) setMenuOpen(o => !o)
    else setLoginOpen(true)
  }

  function go(path) {
    setMenuOpen(false)
    navigate(path)
  }

  async function logout() {
    setMenuOpen(false)
    await signOut()
    navigate('/')
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={onIconClick} aria-label={t('auth.menuProfile')}>
        <IoPersonCircleOutline className="text-[color:var(--text-muted)] text-3xl" />
      </button>

      {menuOpen && user && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl bg-[var(--surface)] border border-[color:var(--border-2)] shadow-xl py-1 z-30">
          <MenuItem onClick={() => go('/profilo')}>{t('auth.menuProfile')}</MenuItem>
          <MenuItem onClick={() => go('/profilo')}>{t('auth.menuSettings')}</MenuItem>
          <div className="my-1 h-px bg-[var(--border-1)]" />
          <MenuItem onClick={logout} danger>{t('auth.menuLogout')}</MenuItem>
        </div>
      )}

      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </div>
  )
}

function MenuItem({ onClick, danger, children }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--fill-1)] transition-colors ${
        danger ? 'text-red-400' : 'text-[color:var(--text)]'
      }`}
    >
      {children}
    </button>
  )
}

export default UserMenu
