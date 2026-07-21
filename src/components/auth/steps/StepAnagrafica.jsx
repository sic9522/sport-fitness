import { useLang } from '../../../context/LanguageContext'
import Field from '../../ui/Field'
import DateField from '../../ui/DateField'
import { birthYearRange } from '../../../utils/date'

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
      {/* Data di nascita: ruote nello stile del mockup, non l'input date nativo.
          L'intervallo parte da 110 anni fa e arriva a 5 anni fa: scorrere fino
          all'anno giusto e' immediato invece di passare per un calendario mensile. */}
      <DateField
        label={t('auth.birthDate')}
        value={data.birthDate}
        onChange={v => onChange({ birthDate: v })}
        error={errors.birthDate}
        minYear={birthYearRange.from}
        maxYear={birthYearRange.to}
      />
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
