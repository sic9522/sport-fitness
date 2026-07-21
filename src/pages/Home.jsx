import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { IoFlash, IoBarbell, IoRestaurant } from 'react-icons/io5'
import TopBar from '../components/TopBar'
import RingChart from '../components/RingChart'
import GoalCard from '../components/GoalCard'
import { loadRings } from '../data/ringDefaults'
import { DEFAULT_GOALS } from '../data/goalDefaults'
import { useLang } from '../context/LanguageContext'
import { todayKey } from '../utils/date'
import { loadDiario, dayMeals, dayTotals, loadNutritionGoals, todayDate } from '../data/nutritionDefaults'
import { useAuth } from '../context/AuthContext'
import { getProfile } from '../services/profile'
import { greetingKey, currentHour, displayFirstName } from '../utils/greeting'
import { loadHydration, loadHydrationGoal, dayMl } from '../data/hydrationDefaults'
import { loadWorkoutLog, minutesOn } from '../data/workoutLog'

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

// Anelli con i valori REALI di oggi. I default (colore, etichetta, obiettivo) restano,
// ma `current` non è più un numero demo: viene dal diario, dal tracker idratazione e
// dal registro allenamenti. L'obiettivo di calorie/acqua segue quello impostato.
function ringsWithToday(base) {
  const key = todayKey()
  const kcal = dayTotals(dayMeals(loadDiario(), key)).kcal
  const liters = dayMl(loadHydration(), key) / 1000
  const minutes = minutesOn(loadWorkoutLog(), key)
  const kcalTarget = loadNutritionGoals().kcal
  const waterTarget = loadHydrationGoal() / 1000

  return base.map(r => {
    if (r.id === 'ring1') return { ...r, current: Math.round(kcal), target: kcalTarget || r.target }
    if (r.id === 'ring2') return { ...r, current: Math.round(liters * 10) / 10, target: waterTarget || r.target }
    if (r.id === 'ring3') return { ...r, current: minutes }
    return r
  })
}

function Home() {
  const { user } = useAuth()
  const [rings] = useState(() => ringsWithToday(loadRings()))

  // Fascia oraria e data si fissano al montaggio: tenerle fuori dal render evita di
  // leggere l'orologio a ogni ridisegno (react-hooks/purity).
  const [greetKey] = useState(() => greetingKey(currentHour()))
  const [now] = useState(todayDate)

  // Profilo salvato: se c'è, il suo nome ha la precedenza su quello del provider.
  const [profile, setProfile] = useState(null)
  useEffect(() => {
    if (!user) return undefined
    let alive = true
    getProfile(user.id)
      .then(p => { if (alive) setProfile(p) })
      .catch(() => { /* nessun profilo: si salutera' col nome del provider */ })
    return () => { alive = false }
  }, [user])

  const [goals] = useState(loadGoals)
  const [activeCategory, setActiveCategory] = useState('daily')
  const { t, lang } = useLang()

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
  const firstName = displayFirstName(user, profile)
  const dateLabel = now.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex flex-col pb-28">
      <TopBar icon={IoFlash} title={t('brand.app')} titleLink="/" />

      {/* Saluto: fascia oraria + nome dell'utente quando lo conosciamo. Da non loggati
          resta il sottotitolo generico, senza spazi vuoti né "undefined". */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-[color:var(--text-muted)] text-sm capitalize">{dateLabel}</p>
        <h2 className="text-2xl font-extrabold leading-tight">
          {firstName ? t(greetKey, { name: firstName }) : t(`${greetKey}NoName`)}
        </h2>
      </div>

      {/* Anelli + Legenda */}
      <div className="flex flex-col items-center pt-4 pb-2">
        <RingChart rings={rings} />

        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-5 px-4">
          {rings.map((ring) => (
            <div key={ring.id} className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ring.color }} />
                <span className="text-xs text-[color:var(--text-muted)]">{ring.labelKey ? t(ring.labelKey) : ring.label}</span>
              </div>
              <span className="text-sm font-bold">
                {ring.current}
                <span className="text-[color:var(--text-dim)] font-normal text-xs"> {ring.unit}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions (dal mockup Home): le due azioni più frequenti a portata di tap. */}
      <div className="px-5 mt-6 grid grid-cols-2 gap-3">
        <Link
          to="/palestra"
          className="rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-4 hover:bg-[var(--surface-3)] transition-colors"
        >
          <IoBarbell className="text-2xl mb-2" style={{ color: 'var(--accent)' }} />
          <p className="font-bold text-sm leading-tight">{t('home.startWorkout')}</p>
        </Link>
        <Link
          to="/alimentazione"
          className="rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-4 hover:bg-[var(--surface-3)] transition-colors"
        >
          <IoRestaurant className="text-2xl mb-2" style={{ color: 'var(--accent)' }} />
          <p className="font-bold text-sm leading-tight">{t('home.logMeal')}</p>
        </Link>
      </div>

      {/* Carousel obiettivi */}
      <div className="px-5 mt-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-dim)] mb-3">
          {t('home.yourGoals')}
        </p>

        {/* Tab selector */}
        <div className="grid grid-cols-3 gap-1 bg-[var(--surface)] rounded-full p-1 mb-4">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className="py-2 rounded-full text-xs font-semibold transition-all duration-200"
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
