import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { IoPulseOutline, IoChevronBack } from 'react-icons/io5'
import { useLang } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import StepMethod from './steps/StepMethod'
import StepAnagrafica from './steps/StepAnagrafica'
import StepFisico from './steps/StepFisico'
import { signUpWithEmail, signInWithProvider } from '../../services/auth'
import { savePendingProfile, flushPendingProfile } from '../../services/profile'
import {
  isEmail, isMinLength, isNonEmpty, isPhone, isPostalCode, isPastDate, isPositiveNumber,
} from '../../utils/validators'

const STEP_TITLES = ['auth.stepMethod', 'auth.stepAnagrafica', 'auth.stepFisico']
const TOTAL = STEP_TITLES.length

const EMPTY = {
  method: null,
  email: '',
  password: '',
  anagrafica: { firstName: '', lastName: '', birthDate: '', phone: '', city: '', address: '', postalCode: '' },
  fisico: { height: '', weight: '' },
}

// Wizard di registrazione multi-step. I dati restano in un unico stato: tornare
// indietro non li perde. Alla fine autentica (email o provider) e i dati vengono
// associati all'utente tramite il "pending profile" (services/profile).
function RegistrationWizard() {
  const { t } = useLang()
  const { isConfigured } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [data, setData] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const setTop = patch => setData(d => ({ ...d, ...patch }))
  const setAna = patch => setData(d => ({ ...d, anagrafica: { ...d.anagrafica, ...patch } }))
  const setFis = patch => setData(d => ({ ...d, fisico: { ...d.fisico, ...patch } }))

  function validate() {
    const e = {}
    if (step === 0) {
      if (!data.method) e.method = t('valid.method')
      if (data.method === 'email') {
        if (!isEmail(data.email)) e.email = t('valid.email')
        if (!isMinLength(data.password, 6)) e.password = t('valid.password')
      }
    } else if (step === 1) {
      const a = data.anagrafica
      if (!isNonEmpty(a.firstName)) e.firstName = t('valid.required')
      if (!isNonEmpty(a.lastName)) e.lastName = t('valid.required')
      if (!isPastDate(a.birthDate)) e.birthDate = t('valid.birthDate')
      if (!isPhone(a.phone)) e.phone = t('valid.phone')
      if (!isNonEmpty(a.city)) e.city = t('valid.required')
      if (!isNonEmpty(a.address)) e.address = t('valid.required')
      if (!isPostalCode(a.postalCode)) e.postalCode = t('valid.postalCode')
    } else if (step === 2) {
      if (!isPositiveNumber(data.fisico.height)) e.height = t('valid.positive')
      if (!isPositiveNumber(data.fisico.weight)) e.weight = t('valid.positive')
    }
    return e
  }

  function next() {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    if (step < TOTAL - 1) setStep(s => s + 1)
    else finish()
  }

  function back() {
    setError('')
    setErrors({})
    if (step === 0) navigate('/')
    else setStep(s => s - 1)
  }

  async function finish() {
    setSubmitting(true)
    setError('')
    // I dati raccolti si scrivono sul profilo appena l'utente e' autenticato.
    savePendingProfile({ anagrafica: data.anagrafica, fisico: data.fisico })
    try {
      if (data.method === 'email') {
        const displayName = [data.anagrafica.firstName, data.anagrafica.lastName].filter(Boolean).join(' ')
        const { data: res, error: err } = await signUpWithEmail(data.email, data.password, { display_name: displayName })
        if (err) { setError(err.message); setSubmitting(false); return }
        if (res.session) {
          await flushPendingProfile(res.session.user)
          navigate('/')
        } else {
          setMessage(t('auth.checkEmail')) // conferma email: il profilo si scrive al primo login
          setSubmitting(false)
        }
      } else {
        // provider OAuth: redirect; il profilo si scrive al ritorno (flushPendingProfile)
        const { error: err } = await signInWithProvider(data.method)
        if (err) { setError(err.message); setSubmitting(false) }
      }
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  const isLast = step === TOTAL - 1

  return (
    <main className="min-h-screen bg-[var(--body-bg)] text-[color:var(--text)] max-w-[420px] mx-auto px-5 py-8 flex flex-col">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
        <IoPulseOutline className="text-2xl" style={{ color: 'var(--accent)' }} />
        {t('brand.app')}
      </Link>

      <div className="mt-8 mb-6">
        <p className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">
          {t('auth.step', { n: step + 1, total: TOTAL })}
        </p>
        <h1 className="text-2xl font-extrabold mt-1">{t(STEP_TITLES[step])}</h1>
        <div className="mt-3 flex gap-1">
          {STEP_TITLES.map((title, i) => (
            <span
              key={title}
              className="h-1 flex-1 rounded-full"
              style={{ backgroundColor: i <= step ? 'var(--accent)' : 'var(--fill-1)' }}
            />
          ))}
        </div>
      </div>

      {!isConfigured && (
        <div className="rounded-xl border border-[color:var(--border-2)] bg-[var(--surface)] p-4 text-sm text-[color:var(--text-muted)] mb-4">
          {t('auth.supabaseMissing')}
        </div>
      )}

      <div className="flex-1">
        {step === 0 && <StepMethod data={data} errors={errors} onChange={setTop} />}
        {step === 1 && <StepAnagrafica data={data.anagrafica} errors={errors} onChange={setAna} />}
        {step === 2 && <StepFisico data={data.fisico} errors={errors} onChange={setFis} />}
      </div>

      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
      {message && <p className="text-sm text-green-400 mt-3">{message}</p>}

      <div className="flex gap-2 mt-6">
        <button
          onClick={back}
          disabled={submitting}
          className="flex items-center justify-center gap-1 rounded-xl py-3 px-4 font-semibold border border-[color:var(--border-2)] bg-[var(--surface)] disabled:opacity-40"
        >
          <IoChevronBack /> {t('auth.back')}
        </button>
        <button
          onClick={next}
          disabled={submitting || !isConfigured}
          className="flex-1 rounded-xl py-3 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          {submitting ? t('auth.creating') : isLast ? t('auth.createAccount') : t('auth.next')}
        </button>
      </div>

      <p className="text-center text-sm text-[color:var(--text-muted)] mt-6">
        {t('auth.haveAccount')}{' '}
        <Link to="/" className="font-semibold" style={{ color: 'var(--accent)' }}>{t('auth.login')}</Link>
      </p>
    </main>
  )
}

export default RegistrationWizard
