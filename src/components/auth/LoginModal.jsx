import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoClose } from 'react-icons/io5'
import { useLang } from '../../context/LanguageContext'
import useScrollLock from '../../hooks/useScrollLock'
import Field from '../ui/Field'
import ProviderButtons from './ProviderButtons'
import PhoneOtpForm from './PhoneOtpForm'
import { signInWithEmail, signInWithProvider } from '../../services/auth'
import { isOtpProvider } from '../../lib/authProviders'

// Modale di login: email/password oppure numero di telefono (SMS) o provider
// OAuth + link registrazione.
function LoginModal({ onClose }) {
  const { t } = useLang()
  const navigate = useNavigate()
  useScrollLock()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // Il login col numero sostituisce il form email finche' non si torna indietro.
  const [phoneMode, setPhoneMode] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { error: err } = await signInWithEmail(email, password)
      if (err) { setError(err.message); return }
      onClose()
    } finally {
      setLoading(false)
    }
  }

  async function pickProvider(providerId) {
    setError('')
    if (isOtpProvider(providerId)) { setPhoneMode(true); return }
    try {
      const { error: err } = await signInWithProvider(providerId)
      if (err) setError(err.message)
      // in caso di successo il browser viene rediretto al provider
    } catch (err) {
      setError(err.message)
    }
  }

  function goRegister() {
    onClose()
    navigate('/registrazione')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[color:var(--border-2)] p-5"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label={t('common.cancel')}
          className="absolute top-3 right-3 text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors"
        >
          <IoClose className="text-2xl" />
        </button>

        <h2 className="text-2xl font-extrabold mt-2 mb-4">
          {phoneMode ? t('auth.loginPhone') : t('auth.login')}
        </h2>

        {phoneMode ? (
          <>
            <PhoneOtpForm onVerified={onClose} />
            <button
              onClick={() => setPhoneMode(false)}
              className="mt-4 w-full text-sm font-semibold text-[color:var(--text-muted)]"
            >
              {t('auth.otherMethods')}
            </button>
          </>
        ) : (
          <>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <Field
                label={t('auth.email')}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <Field
                label={t('auth.password')}
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
              />

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                disabled={loading}
                className="mt-1 w-full rounded-xl py-3 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
              >
                {loading ? t('auth.signingIn') : t('auth.signIn')}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wider text-[color:var(--text-dim)]">
              <span className="h-px flex-1 bg-[var(--border-2)]" />
              {t('auth.orContinueWith')}
              <span className="h-px flex-1 bg-[var(--border-2)]" />
            </div>

            <ProviderButtons onSelect={pickProvider} busy={loading} />
          </>
        )}

        <p className="text-center text-sm text-[color:var(--text-muted)] mt-5">
          {t('auth.noAccount')}{' '}
          <button onClick={goRegister} className="font-semibold" style={{ color: 'var(--accent)' }}>
            {t('auth.goRegister')}
          </button>
        </p>
      </div>
    </div>
  )
}

export default LoginModal
