import { useState } from 'react'
import { useLang } from '../../context/LanguageContext'
import Field from '../ui/Field'
import { sendPhoneOtp, verifyPhoneOtp, toE164 } from '../../services/auth'
import { isPhone } from '../../utils/validators'

// Accesso col numero di telefono (Supabase Phone provider su Twilio), in due
// fasi nella stessa schermata: numero -> codice a 6 cifre. Condiviso tra login e
// registrazione; cambia solo `createUser` (il login non deve creare account).
function PhoneOtpForm({ onVerified, createUser = false, submitLabelKey = 'auth.signIn' }) {
  const { t } = useLang()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function send(e) {
    e.preventDefault()
    if (!isPhone(phone)) { setError(t('valid.phone')); return }
    setBusy(true)
    setError('')
    try {
      const { error: err } = await sendPhoneOtp(phone, { createUser })
      if (err) { setError(err.message); return }
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function verify(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data, error: err } = await verifyPhoneOtp(phone, code)
      if (err) { setError(err.message); return }
      onVerified?.({ session: data?.session, user: data?.user, phone: toE164(phone) })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={sent ? verify : send} className="flex flex-col gap-3">
      <Field
        label={t('auth.phone')}
        type="tel"
        autoComplete="tel"
        placeholder="+39 333 1234567"
        value={phone}
        onChange={e => { setPhone(e.target.value); setError('') }}
        disabled={sent}
      />

      {sent && (
        <>
          <Field
            label={t('auth.otpCode')}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            placeholder="123456"
            value={code}
            onChange={e => { setCode(e.target.value); setError('') }}
          />
          <p className="text-xs text-[color:var(--text-muted)]">
            {t('auth.otpSent', { phone: toE164(phone) })}
          </p>
        </>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        disabled={busy || (sent && !code.trim())}
        className="mt-1 w-full rounded-xl py-3 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
      >
        {busy ? t('auth.sending') : sent ? t(submitLabelKey) : t('auth.sendCode')}
      </button>

      {sent && (
        <button
          type="button"
          disabled={busy}
          onClick={() => { setSent(false); setCode(''); setError('') }}
          className="text-sm font-semibold text-[color:var(--text-muted)] disabled:opacity-40"
        >
          {t('auth.changePhone')}
        </button>
      )}
    </form>
  )
}

export default PhoneOtpForm
