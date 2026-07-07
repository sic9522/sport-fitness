import { useState, useRef } from 'react'
import { IoFlash } from 'react-icons/io5'
import TopBar from '../components/TopBar'
import RingChart from '../components/RingChart'
import GoalCard from '../components/GoalCard'
import { DEFAULT_RINGS } from '../data/ringDefaults'
import { DEFAULT_GOALS } from '../data/goalDefaults'
import { useLang } from '../context/LanguageContext'

const CATEGORIES = [
  { key: 'daily',   labelKey: 'period.daily'   },
  { key: 'weekly',  labelKey: 'period.weekly'  },
  { key: 'monthly', labelKey: 'period.monthly' },
]

function loadGoals() {
  const saved = localStorage.getItem('fitpulse-goals')
  if (!saved) return DEFAULT_GOALS
  const parsed = JSON.parse(saved)
  // migra longterm → monthly se necessario
  if (parsed.longterm && !parsed.monthly) {
    parsed.monthly = parsed.longterm
    delete parsed.longterm
  }
  return parsed
}

function Home() {
  const [rings] = useState(() => {
    const saved = localStorage.getItem('fitpulse-ring-config')
    return (saved ? JSON.parse(saved) : DEFAULT_RINGS).slice(0, 3)
  })

  const [goals] = useState(loadGoals)
  const [activeCategory, setActiveCategory] = useState('daily')
  const { t } = useLang()

  // Swipe gesture
  const touchStartX = useRef(null)
  const catIndex = CATEGORIES.findIndex(c => c.key === activeCategory)

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) setActiveCategory(CATEGORIES[(catIndex + 1) % CATEGORIES.length].key)
      else setActiveCategory(CATEGORIES[(catIndex - 1 + CATEGORIES.length) % CATEGORIES.length].key)
    }
    touchStartX.current = null
  }

  const activeGoals = (goals[activeCategory] ?? []).slice(0, 5)

  return (
    <div className="flex flex-col pb-28">
      <TopBar icon={IoFlash} title="FITPULSE" titleLink="/" />

      {/* Greeting */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-[color:var(--text-muted)] text-sm">{t('home.greeting')}</p>
        <h2 className="text-2xl font-extrabold leading-tight">{t('home.subtitle')}</h2>
      </div>

      {/* Anelli + Legenda */}
      <div className="flex flex-col items-center pt-4 pb-2">
        <RingChart rings={rings} />

        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-5 px-4">
          {rings.map((ring) => (
            <div key={ring.id} className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ring.color }} />
                <span className="text-xs text-[color:var(--text-muted)]">{ring.label}</span>
              </div>
              <span className="text-sm font-bold">
                {ring.current}
                <span className="text-[color:var(--text-dim)] font-normal text-xs"> {ring.unit}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Carousel obiettivi */}
      <div className="px-5 mt-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-dim)] mb-3">
          {t('home.yourGoals')}
        </p>

        {/* Tab selector */}
        <div className="grid grid-cols-3 gap-1 bg-[var(--surface)] rounded-xl p-1 mb-4">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className="py-2 rounded-lg text-xs font-semibold transition-all duration-200"
              style={
                activeCategory === cat.key
                  ? { backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }
                  : { color: 'var(--text-dim)' }
              }
            >
              {t(cat.labelKey)}
            </button>
          ))}
        </div>

        {/* Contenuto — swipeable */}
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          key={activeCategory}
        >
          {activeGoals.length > 0
            ? activeGoals.map(g => <GoalCard key={g.id} {...g} />)
            : (
              <p className="text-[color:var(--text-faint)] text-sm text-center py-6">
                {t('home.noGoals')}
              </p>
            )
          }
        </div>
      </div>
    </div>
  )
}

export default Home
