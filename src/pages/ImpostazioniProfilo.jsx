import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoPersonCircleOutline } from 'react-icons/io5'
import TopBar from '../components/TopBar'
import Field from '../components/ui/Field'
import DateField from '../components/ui/DateField'
import { birthYearRange } from '../utils/date'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { getProfile, updateProfileFields } from '../services/profile'
import { identityFromUser } from '../utils/greeting'

// Colonne modificabili, nell'ordine in cui compaiono. `type` finisce sull'input.
const FIELDS = [
  { col: 'first_name', labelKey: 'profile.firstName', autoComplete: 'given-name' },
  { col: 'last_name', labelKey: 'profile.lastName', autoComplete: 'family-name' },
  { col: 'birth_date', labelKey: 'profile.birthDate', type: 'date', autoComplete: 'bday' },
  { col: 'phone', labelKey: 'profile.phone', type: 'tel', autoComplete: 'tel' },
  { col: 'address', labelKey: 'profile.address', autoComplete: 'street-address' },
  { col: 'city', labelKey: 'profile.city', autoComplete: 'address-level2' },
  { col: 'postal_code', labelKey: 'profile.postalCode', autoComplete: 'postal-code' },
]

const emptyForm = () => Object.fromEntries(FIELDS.map(f => [f.col, '']))

// Dati anagrafici dell'utente, modificabili. Nome, cognome e foto arrivano precompilati
// dall'account del provider (vedi fillFromIdentity), ma restano sempre correggibili:
// qui l'ultima parola e' dell'utente. Gli altri campi il provider non li fornisce.
function ImpostazioniProfilo() {
  const { t } = useLang()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  // Da non loggati non c'è nulla da caricare: si parte già "pronti", così l'effetto
  // non deve chiamare setState in modo sincrono per spegnere il caricamento.
  const [loading, setLoading] = useState(() => Boolean(user))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return undefined
    let alive = true
    getProfile(user.id)
      .then(p => {
        if (!alive) return
        if (p) setForm(Object.fromEntries(FIELDS.map(f => [f.col, p[f.col] ?? ''])))
        setLoading(false)
      })
      .catch(() => { if (alive) { setError(t('profile.loadError')); setLoading(false) } })
    return () => { alive = false }
  }, [user, t])

  const set = (col, value) => {
    setForm(f => ({ ...f, [col]: value }))
    setSaved(false)
  }

  async function save() {
    if (!user) return
    setSaving(true)
    setError('')
    try {
      await updateProfileFields(user.id, form)
      setSaved(true)
    } catch {
      setError(t('profile.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const identity = identityFromUser(user)

  if (!user) {
    return (
      <div className="flex flex-col pb-28">
        <TopBar title={t('profile.title')} onBack={() => navigate('/profilo')} />
        <p className="px-5 pt-6 text-sm text-[color:var(--text-muted)]">{t('auth.loginRequired')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-28">
      <TopBar title={t('profile.title')} onBack={() => navigate('/profilo')} />

      <div className="px-5 pt-5">
        {/* Foto ed email vengono dall'account e non si modificano da qui. */}
        <div className="flex items-center gap-4 rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-4 mb-4">
          {identity.avatarUrl ? (
            <img src={identity.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <IoPersonCircleOutline className="text-5xl text-[color:var(--text-muted)]" />
          )}
          <div className="min-w-0">
            <p className="text-xs text-[color:var(--text-dim)]">{t('profile.fromAccount')}</p>
            <p className="text-sm truncate">{identity.email}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-[color:var(--text-muted)]">{t('common.loading')}</p>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {FIELDS.map(f => (
                f.type === 'date' ? (
                  <DateField
                    key={f.col}
                    label={t(f.labelKey)}
                    value={form[f.col]}
                    onChange={v => set(f.col, v)}
                    minYear={birthYearRange.from}
                    maxYear={birthYearRange.to}
                  />
                ) : (
                  <Field
                    key={f.col}
                    label={t(f.labelKey)}
                    type={f.type || 'text'}
                    autoComplete={f.autoComplete}
                    value={form[f.col]}
                    onChange={e => set(f.col, e.target.value)}
                  />
                )
              ))}
            </div>

            <p className="mt-3 text-xs text-[color:var(--text-faint)] leading-snug">
              {t('profile.providerNote')}
            </p>

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            <button
              onClick={save}
              disabled={saving}
              className="mt-4 w-full rounded-full py-3 font-bold transition-opacity disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              {saving ? t('common.loading') : saved ? t('profile.saved') : t('common.save')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default ImpostazioniProfilo
