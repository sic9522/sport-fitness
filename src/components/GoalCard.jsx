import { useLang } from '../context/LanguageContext'

function GoalCard({ emoji, title, titleKey, current, target, unit }) {
  const { t } = useLang()
  const pct = Math.min((current / target) * 100, 100)

  return (
    <div className="bg-[var(--surface)] rounded-xl p-4 mb-3">
      <div className="flex justify-between items-center mb-2.5">
        <span className="font-semibold text-sm">
          {emoji} {titleKey ? t(titleKey) : title}
        </span>
        <span className="text-[color:var(--text-muted)] text-xs">
          {current} / {target} {unit}
        </span>
      </div>
      <div className="h-1.5 bg-[var(--track)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: 'var(--accent)' }}
        />
      </div>
    </div>
  )
}

export default GoalCard
