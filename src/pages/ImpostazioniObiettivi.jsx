import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoAdd, IoRemove, IoTrashOutline, IoInformationCircleOutline } from 'react-icons/io5'
import TopBar from '../components/TopBar'
import { useLang } from '../context/LanguageContext'
import {
  loadGoals, saveGoals, newGoalId, capitalizeFirst, numericOnly,
  GOAL_EMOJIS, GOAL_UNITS, MAX_GOALS,
} from '../data/goalDefaults'
import { loadWeeklyGoal, saveWeeklyGoal } from '../data/giornateDefaults'

// Cinque emoji proposte piu' un campo per inserirne una qualsiasi. Il campo tiene un
// solo carattere: altrimenti ci si ritroverebbe una parola al posto del simbolo.
function EmojiPicker({ value, onChange }) {
  const { t } = useLang()
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {GOAL_EMOJIS.map(e => (
        <button
          key={e}
          type="button"
          onClick={() => onChange(e)}
          className="h-10 w-10 rounded-xl text-lg flex items-center justify-center border transition-colors"
          style={value === e
            ? { borderColor: 'var(--accent)', backgroundColor: 'var(--fill-1)' }
            : { borderColor: 'var(--border-2)' }}
        >
          {e}
        </button>
      ))}
      <input
        value={GOAL_EMOJIS.includes(value) ? '' : value}
        onChange={e => onChange([...e.target.value].slice(-1)[0] || '')}
        placeholder={t('goals.customEmoji')}
        aria-label={t('goals.customEmoji')}
        className="h-10 w-14 rounded-xl border border-[color:var(--border-2)] bg-[var(--surface-2)] text-center text-lg outline-none focus:ring-1 focus:ring-[var(--accent)]"
      />
    </div>
  )
}

// Obiettivi: si impostano SOLO su base giornaliera. Settimana e mese non sono piu' liste
// separate ma vengono calcolati da questi (vedi scaleGoal in goalDefaults), cosi' i tre
// periodi non possono piu' contraddirsi fra loro.
function ImpostazioniObiettivi() {
  const { t } = useLang()
  const navigate = useNavigate()
  const [goals, setGoals] = useState(loadGoals)
  const [weekly, setWeekly] = useState(loadWeeklyGoal)

  function commit(next) {
    setGoals(next)
    saveGoals(next)
  }

  // Modificando un obiettivo predefinito si perde titleKey: da li' in poi vale il testo
  // scritto dall'utente, non piu' la traduzione.
  const patch = (id, changes) =>
    commit(goals.map(g => (g.id === id ? { ...g, ...changes, titleKey: undefined } : g)))

  function changeWeekly(n) {
    const v = Math.max(1, Math.min(14, n))
    setWeekly(v)
    saveWeeklyGoal(v)
  }

  function add() {
    if (goals.length >= MAX_GOALS) return
    commit([...goals, {
      id: newGoalId(), emoji: GOAL_EMOJIS[0], title: '', target: '', unit: GOAL_UNITS[0], perWorkout: false,
    }])
  }

  return (
    <div className="flex flex-col pb-28">
      <TopBar title={t('title.goals')} onBack={() => navigate('/profilo')} />

      <div className="px-5 pt-5">
        {/* Senza questa spiegazione i numeri di settimana e mese sembrerebbero
            comparire dal nulla. */}
        <div className="flex gap-3 rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-4">
          <IoInformationCircleOutline className="text-xl shrink-0" style={{ color: 'var(--accent)' }} />
          <p className="text-xs text-[color:var(--text-muted)] leading-relaxed">{t('goals.derivedNote')}</p>
        </div>

        {/* Allenamenti a settimana: e' il moltiplicatore degli obiettivi "per
            allenamento", quindi sta qui accanto e non in una pagina lontana. */}
        <div className="rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-4 mt-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{t('settings.weeklyGoal')}</p>
            <p className="text-xs text-[color:var(--text-dim)] mt-0.5">{t('settings.weeklyGoalDesc')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => changeWeekly(weekly - 1)}
              aria-label={t('goals.decrease')}
              className="h-9 w-9 rounded-full border border-[color:var(--border-2)] flex items-center justify-center hover:bg-[var(--surface-3)] transition-colors"
            >
              <IoRemove />
            </button>
            <span className="w-6 text-center font-bold tabular-nums">{weekly}</span>
            <button
              onClick={() => changeWeekly(weekly + 1)}
              aria-label={t('goals.increase')}
              className="h-9 w-9 rounded-full border border-[color:var(--border-2)] flex items-center justify-center hover:bg-[var(--surface-3)] transition-colors"
            >
              <IoAdd />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-4">
          {goals.map(g => (
            <div key={g.id} className="rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <EmojiPicker value={g.emoji} onChange={emoji => patch(g.id, { emoji })} />
                <button
                  onClick={() => commit(goals.filter(x => x.id !== g.id))}
                  aria-label={t('goals.remove')}
                  className="text-[color:var(--text-faint)] hover:text-red-400 transition-colors shrink-0"
                >
                  <IoTrashOutline className="text-lg" />
                </button>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">{t('goals.name')}</span>
                {/* Prima lettera sempre maiuscola, il resto come lo scrive l'utente. */}
                <input
                  value={g.titleKey ? t(g.titleKey) : g.title}
                  onChange={e => patch(g.id, { title: capitalizeFirst(e.target.value) })}
                  placeholder={t('goals.namePlaceholder')}
                  className="w-full bg-[var(--surface-2)] border border-[color:var(--border-2)] rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </label>

              <div className="grid grid-cols-[1fr_6rem] gap-2 mt-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">{t('goals.target')}</span>
                  {/* Solo cifre e un separatore decimale: niente lettere nel valore. */}
                  <input
                    value={g.target}
                    onChange={e => patch(g.id, { target: numericOnly(e.target.value) })}
                    inputMode="decimal"
                    placeholder="0"
                    className="w-full bg-[var(--surface-2)] border border-[color:var(--border-2)] rounded-xl px-4 py-3 text-sm tabular-nums outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">{t('goals.unit')}</span>
                  <select
                    value={g.unit}
                    onChange={e => patch(g.id, { unit: e.target.value })}
                    className="w-full bg-[var(--surface-2)] border border-[color:var(--border-2)] rounded-xl px-3 py-3 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  >
                    {GOAL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </label>
              </div>

              {/* Decide come si scala: "ogni giorno" ×7, "per allenamento" × sessioni. */}
              <div className="grid grid-cols-2 gap-1 bg-[var(--surface-2)] rounded-full p-1 mt-3">
                {[false, true].map(pw => (
                  <button
                    key={String(pw)}
                    onClick={() => patch(g.id, { perWorkout: pw })}
                    className="py-2 rounded-full text-xs font-semibold transition-all"
                    style={Boolean(g.perWorkout) === pw
                      ? { backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }
                      : { color: 'var(--text-dim)' }}
                  >
                    {t(pw ? 'goals.perWorkout' : 'goals.everyDay')}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={add}
          disabled={goals.length >= MAX_GOALS}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold transition-opacity disabled:opacity-40"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          <IoAdd className="text-xl" />
          {t('goals.add')}
        </button>
        <p className="mt-2 text-center text-xs text-[color:var(--text-faint)]">
          {t('goals.count', { n: goals.length, max: MAX_GOALS })}
        </p>
      </div>
    </div>
  )
}

export default ImpostazioniObiettivi
