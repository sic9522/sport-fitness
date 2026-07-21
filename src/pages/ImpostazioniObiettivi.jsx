import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoAdd, IoRemove, IoTrashOutline, IoInformationCircleOutline, IoChevronDown, IoClose,
} from 'react-icons/io5'
import TopBar from '../components/TopBar'
import { useLang } from '../context/LanguageContext'
import {
  loadGoals, saveGoals, newGoalId, capitalizeFirst, numericOnly,
  loadCustomEmojis, saveCustomEmojis, addCustomEmoji,
  GOAL_EMOJIS, GOAL_UNITS, MAX_GOALS,
} from '../data/goalDefaults'
import { loadWeeklyGoal, saveWeeklyGoal } from '../data/giornateDefaults'

const emptyDraft = () => ({
  id: null, emoji: GOAL_EMOJIS[0], title: '', target: '', unit: GOAL_UNITS[0], perWorkout: false,
})

// Scelta dell'emoji: le cinque proposte piu' un "+" sulla stessa riga. Il "+" apre un
// pannello con le emoji gia' salvate sull'account e il campo per aggiungerne una nuova,
// cosi' la riga resta compatta e la personalizzazione non occupa spazio finche' non serve.
function EmojiField({ value, onChange }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState(loadCustomEmojis)
  const [draft, setDraft] = useState('')

  function commitCustom() {
    const next = addCustomEmoji(custom, draft)
    setCustom(next)
    saveCustomEmojis(next)
    // Se l'emoji è entrata (o esisteva già), la si seleziona subito.
    if (next[0] && next !== custom) onChange(next[0])
    setDraft('')
  }

  const cell = 'h-10 w-10 rounded-xl text-lg flex items-center justify-center border transition-colors shrink-0'
  const styleFor = e => (value === e
    ? { borderColor: 'var(--accent)', backgroundColor: 'var(--fill-1)' }
    : { borderColor: 'var(--border-2)' })

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        {GOAL_EMOJIS.map(e => (
          <button key={e} type="button" onClick={() => onChange(e)} className={cell} style={styleFor(e)}>
            {e}
          </button>
        ))}
        {/* Emoji personalizzata gia' scelta ma non fra le proposte: si mostra comunque,
            altrimenti la selezione sembrerebbe sparita. */}
        {value && !GOAL_EMOJIS.includes(value) && (
          <button type="button" className={cell} style={styleFor(value)}>{value}</button>
        )}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-label={t('goals.customEmoji')}
          aria-expanded={open}
          className={`${cell} text-[color:var(--text-dim)]`}
          style={{ borderColor: 'var(--border-2)' }}
        >
          {open ? <IoChevronDown className="text-base rotate-180 transition-transform" /> : <IoAdd className="text-lg" />}
        </button>
      </div>

      {open && (
        <div className="mt-2 rounded-xl border border-[color:var(--border-2)] bg-[var(--surface-2)] p-3">
          <p className="text-xs text-[color:var(--text-dim)] mb-2">{t('goals.myEmojis')}</p>
          {custom.length > 0 ? (
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {custom.map(e => (
                <button key={e} type="button" onClick={() => onChange(e)} className={cell} style={styleFor(e)}>
                  {e}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[color:var(--text-faint)] mb-3">{t('goals.noCustomEmoji')}</p>
          )}
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitCustom() } }}
              placeholder={t('goals.emojiPlaceholder')}
              aria-label={t('goals.emojiPlaceholder')}
              className="h-10 flex-1 min-w-0 rounded-xl border border-[color:var(--border-2)] bg-[var(--surface)] px-3 text-lg outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
            <button
              type="button"
              onClick={commitCustom}
              disabled={!draft.trim()}
              className="h-10 px-4 rounded-xl text-sm font-bold disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              {t('goals.addEmoji')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Obiettivo gia' creato: scheda compatta e NON modificabile. Cambiare un obiettivo a
// meta' percorso falserebbe i confronti nel tempo, quindi si puo' solo eliminare e
// ricrearlo.
function GoalCardRow({ goal, onDelete }) {
  const { t } = useLang()
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] px-4 py-3">
      <span className="text-xl shrink-0">{goal.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{goal.titleKey ? t(goal.titleKey) : goal.title}</p>
        <p className="text-xs text-[color:var(--text-dim)] tabular-nums">
          {t('goals.target', { target: goal.target, unit: goal.unit })}
          {' · '}
          {t(goal.perWorkout ? 'goals.perWorkout' : 'goals.everyDay')}
        </p>
      </div>
      <button
        onClick={onDelete}
        aria-label={t('goals.remove')}
        className="text-[color:var(--text-faint)] hover:text-red-400 transition-colors shrink-0"
      >
        <IoTrashOutline className="text-lg" />
      </button>
    </div>
  )
}

// Obiettivi: si impostano SOLO su base giornaliera, settimana e mese sono derivati
// (vedi scaleGoal). Questa schermata serve a CREARE: gli obiettivi esistenti si vedono
// in forma compatta e si possono solo eliminare.
function ImpostazioniObiettivi() {
  const { t } = useLang()
  const navigate = useNavigate()
  const [goals, setGoals] = useState(loadGoals)
  const [weekly, setWeekly] = useState(loadWeeklyGoal)
  const [draft, setDraft] = useState(null) // null = nessuna creazione in corso

  function commit(next) {
    setGoals(next)
    saveGoals(next)
  }

  function changeWeekly(n) {
    const v = Math.max(1, Math.min(14, n))
    setWeekly(v)
    saveWeeklyGoal(v)
  }

  const canSave = draft && draft.title.trim() !== '' && Number(draft.target) > 0

  function save() {
    if (!canSave) return
    commit([...goals, { ...draft, id: newGoalId(), target: Number(draft.target) }])
    setDraft(null)
  }

  const full = goals.length >= MAX_GOALS

  return (
    <div className="flex flex-col pb-28">
      <TopBar title={t('title.goals')} onBack={() => navigate('/profilo')} />

      <div className="px-5 pt-5">
        <div className="flex gap-3 rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-4">
          <IoInformationCircleOutline className="text-xl shrink-0" style={{ color: 'var(--accent)' }} />
          <p className="text-xs text-[color:var(--text-muted)] leading-relaxed">{t('goals.derivedNote')}</p>
        </div>

        {/* Allenamenti a settimana: e' il moltiplicatore degli obiettivi "per
            allenamento", quindi sta qui e non in una pagina lontana. */}
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

        <div className="flex flex-col gap-2 mt-4">
          {goals.map(g => (
            <GoalCardRow key={g.id} goal={g} onDelete={() => commit(goals.filter(x => x.id !== g.id))} />
          ))}
        </div>

        {/* Form di creazione: compare solo quando si sta aggiungendo. */}
        {draft && (
          <div className="rounded-2xl bg-[var(--surface)] border border-[color:var(--border-2)] p-4 mt-3">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-bold text-sm">{t('goals.newGoal')}</h2>
              <button
                onClick={() => setDraft(null)}
                aria-label={t('common.cancel')}
                className="text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors"
              >
                <IoClose className="text-xl" />
              </button>
            </div>

            <EmojiField value={draft.emoji} onChange={emoji => setDraft(d => ({ ...d, emoji }))} />

            <label className="flex flex-col gap-1 mt-3">
              <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">{t('goals.name')}</span>
              {/* Prima lettera sempre maiuscola, il resto come lo scrive l'utente. */}
              <input
                value={draft.title}
                onChange={e => setDraft(d => ({ ...d, title: capitalizeFirst(e.target.value) }))}
                placeholder={t('goals.namePlaceholder')}
                className="w-full bg-[var(--surface-2)] border border-[color:var(--border-2)] rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </label>

            <div className="grid grid-cols-[1fr_6rem] gap-2 mt-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">{t('goals.targetLabel')}</span>
                {/* Solo cifre e un separatore decimale: niente lettere nel valore. */}
                <input
                  value={draft.target}
                  onChange={e => setDraft(d => ({ ...d, target: numericOnly(e.target.value) }))}
                  inputMode="decimal"
                  placeholder="0"
                  className="w-full bg-[var(--surface-2)] border border-[color:var(--border-2)] rounded-xl px-4 py-3 text-sm tabular-nums outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wider text-[color:var(--text-dim)]">{t('goals.unit')}</span>
                <select
                  value={draft.unit}
                  onChange={e => setDraft(d => ({ ...d, unit: e.target.value }))}
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
                  onClick={() => setDraft(d => ({ ...d, perWorkout: pw }))}
                  className="py-2 rounded-full text-xs font-semibold transition-all"
                  style={draft.perWorkout === pw
                    ? { backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }
                    : { color: 'var(--text-dim)' }}
                >
                  {t(pw ? 'goals.perWorkout' : 'goals.everyDay')}
                </button>
              ))}
            </div>

            <button
              onClick={save}
              disabled={!canSave}
              className="mt-4 w-full rounded-full py-3 text-sm font-bold transition-opacity disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              {t('common.save')}
            </button>
          </div>
        )}

        {!draft && (
          <button
            onClick={() => setDraft(emptyDraft())}
            disabled={full}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold transition-opacity disabled:opacity-40"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            <IoAdd className="text-xl" />
            {t('goals.add')}
          </button>
        )}

        <p className="mt-2 text-center text-xs text-[color:var(--text-faint)]">
          {t('goals.count', { n: goals.length, max: MAX_GOALS })}
        </p>
      </div>
    </div>
  )
}

export default ImpostazioniObiettivi
