import { useLang } from '../../../context/LanguageContext'
import Field from '../../ui/Field'

// Step 2: dati anagrafici.
function StepAnagrafica({ data, errors, onChange }) {
  const { t } = useLang()
  const set = key => e => onChange({ [key]: e.target.value })

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label={t('auth.firstName')} autoComplete="given-name" value={data.firstName} onChange={set('firstName')} error={errors.firstName} />
        <Field label={t('auth.lastName')} autoComplete="family-name" value={data.lastName} onChange={set('lastName')} error={errors.lastName} />
      </div>
      <Field label={t('auth.birthDate')} type="date" value={data.birthDate} onChange={set('birthDate')} error={errors.birthDate} />
      <Field label={t('auth.phone')} type="tel" autoComplete="tel" value={data.phone} onChange={set('phone')} error={errors.phone} />
      <Field label={t('auth.city')} autoComplete="address-level2" value={data.city} onChange={set('city')} error={errors.city} />
      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <Field label={t('auth.address')} autoComplete="street-address" value={data.address} onChange={set('address')} error={errors.address} />
        <Field label={t('auth.postalCode')} inputMode="numeric" autoComplete="postal-code" value={data.postalCode} onChange={set('postalCode')} error={errors.postalCode} />
      </div>
    </div>
  )
}

export default StepAnagrafica
