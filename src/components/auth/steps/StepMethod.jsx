import { IoMailOutline } from 'react-icons/io5'
import { useLang } from '../../../context/LanguageContext'
import Field from '../../ui/Field'
import ProviderButtons from '../ProviderButtons'
import PhoneOtpForm from '../PhoneOtpForm'

// Step 1: scelta del metodo di registrazione. Per "Email e Password" raccoglie
// gia' le credenziali; i provider OAuth vengono solo selezionati (l'auth avviene
// alla fine del wizard); col numero di telefono si verifica subito il codice SMS,
// perche' senza sessione non si potrebbe proseguire. Altri provider: ProviderButtons.
function StepMethod({ data, errors, onChange, onPhoneVerified }) {
  const { t } = useLang()
  const emailSelected = data.method === 'email'
  const phoneSelected = data.method === 'phone'

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => onChange({ method: 'email' })}
        className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold border transition-colors ${
          emailSelected
            ? 'border-[var(--accent)] bg-[var(--fill-1)]'
            : 'border-[color:var(--border-2)] bg-[var(--surface)] hover:bg-[var(--fill-1)]'
        }`}
      >
        <IoMailOutline className="text-lg" />
        {t('auth.registerEmail')}
      </button>

      <ProviderButtons
        onSelect={id => onChange({ method: id })}
        labelKey="auth.registerWith"
        selectedId={emailSelected ? null : data.method}
      />

      {errors.method && <p className="text-sm text-red-400">{errors.method}</p>}

      {phoneSelected && (
        <div className="mt-2">
          <PhoneOtpForm
            createUser
            submitLabelKey="auth.verifyAndContinue"
            onVerified={onPhoneVerified}
          />
        </div>
      )}

      {emailSelected && (
        <div className="flex flex-col gap-3 mt-2">
          <Field
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            value={data.email}
            onChange={e => onChange({ email: e.target.value })}
            error={errors.email}
          />
          <Field
            label={t('auth.password')}
            type="password"
            autoComplete="new-password"
            value={data.password}
            onChange={e => onChange({ password: e.target.value })}
            error={errors.password}
          />
        </div>
      )}
    </div>
  )
}

export default StepMethod
