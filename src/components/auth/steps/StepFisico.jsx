import { useLang } from '../../../context/LanguageContext'
import Field from '../../ui/Field'

// Step 3: dati fisici. Per ora altezza e peso; altri parametri (sesso, livello
// di attivita', obiettivi, ecc.) vanno in profiles.details senza modifiche
// strutturali, quindi qui bastera' aggiungere campi.
function StepFisico({ data, errors, onChange }) {
  const { t } = useLang()
  const set = key => e => onChange({ [key]: e.target.value })

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label={t('auth.height')} inputMode="decimal" value={data.height} onChange={set('height')} error={errors.height} placeholder="175" />
        <Field label={t('auth.weight')} inputMode="decimal" value={data.weight} onChange={set('weight')} error={errors.weight} placeholder="70" />
      </div>
      <p className="text-xs text-[color:var(--text-dim)]">{t('auth.futureFields')}</p>
    </div>
  )
}

export default StepFisico
