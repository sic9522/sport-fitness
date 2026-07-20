import { useState } from 'react'
import { IoStatsChart, IoWater, IoAdd, IoRemove, IoFlameOutline, IoBarbellOutline } from 'react-icons/io5'
import TopBar from '../components/TopBar'
import { useLang } from '../context/LanguageContext'
import { lastDayKeys, todayKey } from '../utils/date'
import {
  loadHydration, saveHydration, loadHydrationGoal, addMl, dayMl, hydrationPct, GLASS_ML,
} from '../data/hydrationDefaults'
import { loadWorkoutLog, activitySeries, burnedOn } from '../data/workoutLog'
import { loadWeights, latestEntry } from '../data/weightDefaults'
import { loadWeeklyGoal } from '../data/giornateDefaults'

// Iniziali dei giorni per l'asse del grafico: dal locale, così seguono la lingua.
function dayInitial(key, lang) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(lang, { weekday: 'narrow' })
}

// Barra dell'activity trend. L'altezza è relativa al massimo della settimana: con
// tutti i giorni a zero resta una traccia piatta, senza divisioni per zero.
function ActivityBar({ minutes, max, label, today }) {
  const pct = max > 0 ? Math.round((minutes / max) * 100) : 0
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      <div className="w-full h-24 flex items-end rounded-md bg-[var(--track)] overflow-hidden">
        <div
          className="w-full rounded-md transition-all duration-500"
          style={{ height: `${pct}%`, backgroundColor: minutes > 0 ? 'var(--accent)' : 'transparent' }}
        />
      </div>
      <span className={`text-[10px] ${today ? 'font-bold text-[color:var(--text)]' : 'text-[color:var(--text-dim)]'}`}>
        {label}
      </span>
    </div>
  )
}

// Riquadro di una metrica. `value` null = dato non disponibile: mostra un trattino
// invece di inventare uno zero (vale per le kcal stimate senza peso corporeo).
function StatCard({ icon: Icon, label, value, unit, hint }) {
  return (
    <div className="flex-1 rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-4">
      <Icon className="text-xl mb-2" style={{ color: 'var(--accent)' }} />
      <p className="text-xs text-[color:var(--text-dim)] uppercase tracking-wider">{label}</p>
      <p className="mt-1 font-extrabold text-xl tabular-nums">
        {value == null ? '—' : value}
        {value != null && unit ? <span className="text-xs font-normal text-[color:var(--text-dim)]"> {unit}</span> : null}
      </p>
      {hint && <p className="mt-1 text-[10px] text-[color:var(--text-faint)] leading-tight">{hint}</p>}
    </div>
  )
}

function Insights() {
  const { t, lang } = useLang()
  const [hydration, setHydration] = useState(loadHydration)
  const [goalMl] = useState(loadHydrationGoal)
  const [log] = useState(loadWorkoutLog)
  const [weights] = useState(loadWeights)
  const [weeklyGoal] = useState(loadWeeklyGoal)

  const today = todayKey()
  const weekKeys = lastDayKeys(7)
  const series = activitySeries(log, weekKeys)
  const maxMinutes = Math.max(...series.map(s => s.minutes), 0)
  const weekMinutes = series.reduce((sum, s) => sum + s.minutes, 0)
  const weekSessions = series.reduce((sum, s) => sum + s.sessions, 0)

  // Peso più recente: serve alla stima MET delle kcal. Se manca, burnedOn → null.
  const weightKg = latestEntry(weights)?.kg ?? null
  const burnedToday = burnedOn(log, today, weightKg)

  const ml = dayMl(hydration, today)
  const pct = hydrationPct(ml, goalMl)

  function changeWater(delta) {
    const next = addMl(hydration, today, delta)
    setHydration(next)
    saveHydration(next)
  }

  return (
    <div className="flex flex-col pb-28">
      <TopBar icon={IoStatsChart} title={t('title.insights')} />

      <div className="px-5 pt-5">
        {/* Activity trend: minuti allenati negli ultimi 7 giorni, dal registro reale. */}
        <section className="rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-4">
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <h2 className="font-bold">{t('insights.activityTrend')}</h2>
            <span className="text-xs text-[color:var(--text-dim)] tabular-nums">
              {t('insights.weekMinutes', { n: weekMinutes })}
            </span>
          </div>

          {weekMinutes === 0 ? (
            <p className="text-sm text-[color:var(--text-faint)] py-6 text-center">
              {t('insights.noActivity')}
            </p>
          ) : (
            <div className="flex items-end gap-2">
              {series.map(s => (
                <ActivityBar
                  key={s.key}
                  minutes={s.minutes}
                  max={maxMinutes}
                  label={dayInitial(s.key, lang)}
                  today={s.key === today}
                />
              ))}
            </div>
          )}
        </section>

        {/* Metriche del giorno. Le kcal sono una STIMA: dichiarata, non spacciata per misura. */}
        <div className="flex gap-3 mt-3">
          <StatCard
            icon={IoFlameOutline}
            label={t('insights.burned')}
            value={burnedToday}
            unit={t('nutrition.kcal')}
            hint={weightKg == null ? t('insights.burnedNeedsWeight') : t('insights.burnedEstimate')}
          />
          <StatCard
            icon={IoBarbellOutline}
            label={t('insights.weekSessions')}
            value={weekSessions}
            unit={weeklyGoal ? `/ ${weeklyGoal}` : ''}
          />
        </div>

        {/* Idratazione: tracker reale, si aggiunge/toglie un bicchiere alla volta. */}
        <section className="rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-4 mt-3">
          <div className="flex items-center gap-2 mb-3">
            <IoWater className="text-xl" style={{ color: 'var(--accent)' }} />
            <h2 className="font-bold flex-1">{t('insights.hydration')}</h2>
            <span className="text-sm font-bold tabular-nums">
              {(ml / 1000).toFixed(1)}
              <span className="text-[color:var(--text-dim)] font-normal text-xs">
                {' / '}{(goalMl / 1000).toFixed(1)} {t('insights.liters')}
              </span>
            </span>
          </div>

          <div className="h-2 bg-[var(--track)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${pct}%`, backgroundColor: 'var(--accent)' }}
            />
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => changeWater(-GLASS_ML)}
              disabled={ml === 0}
              aria-label={t('insights.removeGlass')}
              className="w-11 h-11 flex items-center justify-center rounded-full border border-[color:var(--border-2)] text-[color:var(--text)] disabled:opacity-30 hover:bg-[var(--surface-3)] transition-colors"
            >
              <IoRemove className="text-xl" />
            </button>
            <button
              onClick={() => changeWater(GLASS_ML)}
              className="flex-1 flex items-center justify-center gap-2 rounded-full py-3 font-bold text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              <IoAdd className="text-xl" />
              {t('insights.addGlass', { ml: GLASS_ML })}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Insights
