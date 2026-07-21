import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { IoPulseOutline, IoChevronBack } from 'react-icons/io5'
import { useLang } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import StepMethod from './steps/StepMethod'
import StepAnagrafica from './steps/StepAnagrafica'
import StepFisico from './steps/StepFisico'
import { signUpWithEmail, signInWithProvider } from '../../services/auth'
import { savePendingProfile, flushPendingProfile, getProfile } from '../../services/profile'
import { identityFromUser } from '../../utils/greeting'
import {
  isEmail, isMinLength, isNonEmpty, isPhone, isPostalCode, isPastDate, isPositiveNumber,
} from '../../utils/validators'

// Passi del wizard. Il primo (scelta del metodo, con email e password) sparisce quando
// si arriva gia' autenticati da un provider: in quel caso le credenziali non servono,
// perche' l'accesso avverra' sempre tramite il provider.
const ALL_STEPS = [
  { key: 'method', titleKey: 'auth.stepMethod' },
  { key: 'anagrafica', titleKey: 'auth.stepAnagrafica' },
  { key: 'fisico', titleKey: 'auth.stepFisico' },
]

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
  const { isConfigured, user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [data, setData] = useState(EMPTY)

  // Ritorno dal provider: l'utente e' gia' autenticato, quindi niente scelta del metodo
  // e nessuna credenziale da chiedere. Restano solo i dati che il provider non da'.
  const viaProvider = Boolean(user)
  const steps = viaProvider ? ALL_STEPS.filter(s => s.key !== 'method') : ALL_STEPS
  const TOTAL = steps.length
  const currentKey = steps[Math.min(step, TOTAL - 1)].key

  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const setTop = patch => setData(d => ({ ...d, ...patch }))
  const setAna = patch => setData(d => ({ ...d, anagrafica: { ...d.anagrafica, ...patch } }))
  const setFis = patch => setData(d => ({ ...d, fisico: { ...d.fisico, ...patch } }))

  // Precompila nome e cognome con quanto arriva dall'account, senza sovrascrivere
  // quello che l'utente ha gia' scritto. Il setState sta in una callback asincrona,
  // non nel corpo dell'effetto.
  useEffect(() => {
    if (!user) return undefined
    let alive = true
    getProfile(user.id)
      .catch(() => null)
      .then(profile => {
        if (!alive) return
        const id = identityFromUser(user)
        const parts = id.fullName ? id.fullName.split(/\s+/) : []
        setData(d => ({
          ...d,
          anagrafica: {
            ...d.anagrafica,
            firstName: d.anagrafica.firstName || profile?.first_name || id.firstName || parts[0] || '',
            lastName: d.anagrafica.lastName || profile?.last_name || id.lastName || parts.slice(1).join(' ') || '',
            birthDate: d.anagrafica.birthDate || profile?.birth_date || '',
            phone: d.anagrafica.phone || profile?.phone || '',
            city: d.anagrafica.city || profile?.city || '',
            address: d.anagrafica.address || profile?.address || '',
            postalCode: d.anagrafica.postalCode || profile?.postal_code || '',
          },
        }))
      })
    return () => { alive = false }
  }, [user])

  function validate() {
    const e = {}
    if (currentKey === 'method') {
      if (!data.method) e.method = t('valid.method')
      if (data.method === 'email') {
        if (!isEmail(data.email)) e.email = t('valid.email')
        if (!isMinLength(data.password, 6)) e.password = t('valid.password')
      }
    } else if (currentKey === 'anagrafica') {
      const a = data.anagrafica
      if (!isNonEmpty(a.firstName)) e.firstName = t('valid.required')
      if (!isNonEmpty(a.lastName)) e.lastName = t('valid.required')
      if (!isPastDate(a.birthDate)) e.birthDate = t('valid.birthDate')
      if (!isPhone(a.phone)) e.phone = t('valid.phone')
      if (!isNonEmpty(a.city)) e.city = t('valid.required')
      if (!isNonEmpty(a.address)) e.address = t('valid.required')
      if (!isPostalCode(a.postalCode)) e.postalCode = t('valid.postalCode')
    } else if (currentKey === 'fisico') {
      if (!isPositiveNumber(data.fisico.height)) e.height = t('valid.positive')
      if (!isPositiveNumber(data.fisico.weight)) e.weight = t('valid.positive')
    }
    return e
  }

  async function next() {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return

    // Provider scelto: si autentica SUBITO e si torna qui. Cosi' non si chiedono dati
    // che il provider fornisce gia' (nome, cognome) e non si perde la compilazione se
    // l'accesso viene annullato.
    if (currentKey === 'method' && data.method && data.method !== 'email') {
      setSubmitting(true)
      setError('')
      const { error: err } = await signInWithProvider(data.method, '/registrazione')
      if (err) { setError(err.message); setSubmitting(false) }
      return
    }

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
      // Gia' autenticato dal provider: il profilo si scrive e basta, nessuna credenziale.
      if (viaProvider) {
        await flushPendingProfile(user)
        navigate('/')
        return
      }
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
        <h1 className="text-2xl font-extrabold mt-1">{t(steps[Math.min(step, TOTAL - 1)].titleKey)}</h1>
        <div className="mt-3 flex gap-1">
          {steps.map((s2, i) => (
            <span
              key={s2.key}
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
        {currentKey === 'method' && <StepMethod data={data} errors={errors} onChange={setTop} />}
        {currentKey === 'anagrafica' && <StepAnagrafica data={data.anagrafica} errors={errors} onChange={setAna} />}
        {currentKey === 'fisico' && <StepFisico data={data.fisico} errors={errors} onChange={setFis} />}
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
          {submitting ? t('auth.creating') : isLast ? t(viaProvider ? 'auth.finishProfile' : 'auth.createAccount') : t('auth.next')}
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
