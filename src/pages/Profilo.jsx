import { Link, useNavigate } from 'react-router-dom'
import { IoPersonCircleOutline } from 'react-icons/io5'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { supabase } from '../lib/supabaseClient'

function Profilo() {
  const { t } = useLang()
  const { isConfigured, loading, user } = useAuth()
  const navigate = useNavigate()

  async function logout() {
    if (supabase) await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="flex flex-col pb-24">
      <TopBar title={t('page.profilo')} />

      <div className="px-5 pt-6">
        <div className="flex items-center gap-4 mb-6">
          <IoPersonCircleOutline className="text-6xl text-[color:var(--text-muted)]" />
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold">{t('page.profilo')}</h1>
            <p className="text-sm text-[color:var(--text-muted)] truncate">
              {loading ? 'Caricamento...' : user?.email || 'Account non collegato'}
            </p>
          </div>
        </div>

        {!isConfigured ? (
          <div className="rounded-xl border border-[color:var(--border-2)] bg-[var(--surface)] p-4 text-sm text-[color:var(--text-muted)]">
            Supabase non e ancora configurato. Aggiungi le variabili in `.env.local` per usare login e sincronizzazione.
          </div>
        ) : user ? (
          <button
            onClick={logout}
            className="w-full rounded-xl py-3 font-bold text-white"
            style={{ backgroundColor: '#ef4444' }}
          >
            Esci
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[color:var(--text-muted)]">{t('auth.loginRequired')}</p>
            <Link
              to="/registrazione"
              className="rounded-xl py-3 text-center font-bold"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              {t('page.registrazione')}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profilo
