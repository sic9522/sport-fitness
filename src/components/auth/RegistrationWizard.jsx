import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { IoPulseOutline, IoChevronBack, IoCheckmarkCircle } from 'react-icons/io5'
import { useLang } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import StepMethod from './steps/StepMethod'
import StepAnagrafica from './steps/StepAnagrafica'
import StepFisico from './steps/StepFisico'
import {
  signUpWithEmail, signInWithProvider, signOut,
  markOAuthSignup, consumeOAuthSignup, isExistingUser,
} from '../../services/auth'
import { isOtpProvider } from '../../lib/authProviders'
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

  // Il marcatore si legge (e si azzera) UNA volta al montaggio: distingue "sono appena
  // tornato da Google per registrarmi" da "ero gia' loggato e ho aperto /registrazione".
  const [fromOAuth] = useState(consumeOAuthSignup)

  // Il numero di telefono si verifica col codice SMS gia' allo step 1: da li' in poi
  // la sessione e' attiva, quindi il wizard raccoglie solo i dati del profilo.
  const [phoneAuthed, setPhoneAuthed] = useState(false)

  // Ritorno dal provider: l'utente e' gia' autenticato, quindi niente scelta del metodo
  // e nessuna credenziale da chiedere. Restano solo i dati che il provider non da'.
  const viaProvider = fromOAuth && Boolean(user)

  // Autenticato durante (o prima di) questo wizard: alla fine si scrive solo il profilo.
  const preAuthed = viaProvider || phoneAuthed

  // Gia' autenticato senza essere passati di qui: l'account esiste, non se ne crea un altro.
  const alreadyRegistered = Boolean(user) && !fromOAuth && !phoneAuthed
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
    if (currentKey === 'method' && data.method && data.method !== 'email' && !isOtpProvider(data.method)) {
      setSubmitting(true)
      setError('')
      markOAuthSignup() // al ritorno il wizard sapra' che il redirect partiva da qui
      const { error: err } = await signInWithProvider(data.method, '/registrazione')
      if (err) { setError(err.message); setSubmitting(false) }
      return
    }

    if (step < TOTAL - 1) setStep(s => s + 1)
    else finish()
  }

  // Codice SMS verificato: la sessione c'e', si prosegue con i dati del profilo
  // e il numero appena confermato precompila l'anagrafica.
  function phoneVerified({ phone }) {
    setPhoneAuthed(true)
    setError('')
    setAna({ phone })
    setStep(s => s + 1)
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
      // Gia' autenticato (provider o SMS): il profilo si scrive e basta, nessuna credenziale.
      if (preAuthed) {
        await flushPendingProfile(user)
        navigate('/')
        return
      }
      if (data.method === 'email') {
        const displayName = [data.anagrafica.firstName, data.anagrafica.lastName].filter(Boolean).join(' ')
        const { data: res, error: err } = await signUpWithEmail(data.email, data.password, { display_name: displayName })
        // Con la conferma email disattivata Supabase risponde con un errore esplicito;
        // con la conferma attiva NON lo fa, per non rivelare quali indirizzi esistono:
        // in quel caso lo si riconosce dalla lista `identities` vuota.
        if (err && /already registered|already been registered/i.test(err.message)) {
          setError(t('auth.alreadyRegisteredEmail')); setSubmitting(false); return
        }
        if (err) { setError(err.message); setSubmitting(false); return }
        if (isExistingUser(res)) {
          setError(t('auth.alreadyRegisteredEmail')); setSubmitting(false); return
        }
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
  // Sullo step del metodo con "numero" scelto comanda il form OTP, non il wizard.
  const phoneStep = currentKey === 'method' && isOtpProvider(data.method)

  // Sessione gia' attiva: non si crea un secondo account. Si dice chi si e' e si offre
  // di entrare, oppure di uscire per registrarne un altro.
  if (alreadyRegistered) {
    return (
      <main className="min-h-screen bg-[var(--body-bg)] text-[color:var(--text)] max-w-[420px] mx-auto px-5 py-8 flex flex-col">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
          <IoPulseOutline className="text-2xl" style={{ color: 'var(--accent)' }} />
          {t('brand.app')}
        </Link>

        <div className="mt-10 rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-5 text-center">
          <IoCheckmarkCircle className="mx-auto text-4xl" style={{ color: 'var(--accent)' }} />
          <h1 className="mt-3 text-xl font-extrabold">{t('auth.alreadyRegisteredTitle')}</h1>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">
            {t('auth.alreadyRegisteredBody', { email: user.email || '' })}
          </p>

          <button
            onClick={() => navigate('/')}
            className="mt-5 w-full rounded-full py-3 font-bold"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            {t('auth.goToApp')}
          </button>

          <button
            onClick={async () => { await signOut(); navigate('/registrazione') }}
            className="mt-2 w-full rounded-full py-3 font-semibold border border-[color:var(--border-2)]"
          >
            {t('auth.registerAnother')}
          </button>
        </div>
      </main>
    )
  }

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
        {currentKey === 'method' && (
          <StepMethod data={data} errors={errors} onChange={setTop} onPhoneVerified={phoneVerified} />
        )}
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
        {/* Col numero si avanza verificando il codice SMS: un "Avanti" qui non avrebbe
            nulla da fare e farebbe solo dubitare di aver sbagliato bottone. */}
        {!phoneStep && (
          <button
            onClick={next}
            disabled={submitting || !isConfigured}
            className="flex-1 rounded-xl py-3 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            {submitting ? t('auth.creating') : isLast ? t(preAuthed ? 'auth.finishProfile' : 'auth.createAccount') : t('auth.next')}
          </button>
        )}
      </div>

      <p className="text-center text-sm text-[color:var(--text-muted)] mt-6">
        {t('auth.haveAccount')}{' '}
        <Link to="/" className="font-semibold" style={{ color: 'var(--accent)' }}>{t('auth.login')}</Link>
      </p>
    </main>
  )
}

export default RegistrationWizard
