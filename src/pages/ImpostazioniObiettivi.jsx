import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoAdd, IoTrash, IoPencil, IoCheckmark } from 'react-icons/io5'
import TopBar from '../components/TopBar'
import { useLang } from '../context/LanguageContext'
import { DEFAULT_GOALS } from '../data/goalDefaults'

const MAX_GOALS = 5

const SECTIONS = [
  { key: 'daily',   labelKey: 'goals.daily',   tabKey: 'period.daily'   },
  { key: 'weekly',  labelKey: 'goals.weekly',  tabKey: 'period.weekly'  },
  { key: 'monthly', labelKey: 'goals.monthly', tabKey: 'period.monthly' },
]

function loadGoals() {
  const saved = localStorage.getItem('fitpulse-goals')
  if (!saved) return DEFAULT_GOALS
  const parsed = JSON.parse(saved)
  if (parsed.longterm && !parsed.monthly) {
    parsed.monthly = parsed.longterm
    delete parsed.longterm
  }
  return parsed
}

// ─── Card visualizzazione ─────────────────────────────────────────────────────
function GoalRow({ goal, onEdit, onDelete }) {
  const { t } = useLang()
  return (
    <div className="bg-[var(--surface)] rounded-xl px-4 py-3 flex items-center gap-3">
      <span className="text-xl shrink-0">{goal.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{goal.title}</p>
        <p className="text-xs text-[color:var(--text-dim)] mt-0.5">
          {t('goals.target', { target: goal.target, unit: goal.unit })}
        </p>
      </div>
      <button onClick={onEdit} className="text-[color:var(--text-dim)] hover:text-[color:var(--text)] transition-colors p-1">
        <IoPencil size={15} />
      </button>
      <button onClick={onDelete} className="text-red-400 hover:text-red-300 transition-colors p-1">
        <IoTrash size={15} />
      </button>
    </div>
  )
}

// ─── Card modifica ────────────────────────────────────────────────────────────
function GoalEditRow({ goal, onChange, onDone }) {
  const { t } = useLang()
  // Stato locale stringa: permette campo vuoto mentre si digita
  // senza rimbalzare subito a "0" quando si cancella
  const [targetStr, setTargetStr] = useState(
    goal.target > 0 ? String(goal.target) : ''
  )

  function handleTarget(e) {
    const raw = e.target.value
    // Normalizza virgola → punto (iOS italiano usa "," come separatore decimale)
    const norm = raw.replace(',', '.')
    // Solo cifre e al massimo un separatore decimale
    if (!/^(\d*\.?\d*)$/.test(norm)) return
    // Blocca zero iniziale seguito da cifra: "01", "02" ecc.
    // Eccezione: "0", "0." e "0," (inizio decimale) sono permessi
    if (norm.length > 1 && norm[0] === '0' && norm[1] !== '.') return
    setTargetStr(raw)                          // mostra ciò che l'utente ha scritto
    const num = parseFloat(norm)               // parsa la versione normalizzata
    if (!isNaN(num) && num >= 0) onChange('target', num)
  }

  const inputCls = 'bg-[var(--surface-2)] border border-[color:var(--border-2)] rounded-lg px-2 py-2 text-sm text-[color:var(--text)] outline-none focus:border-[color:var(--border-4)]'

  return (
    <div className="bg-[var(--surface)] rounded-xl p-4">
      {/* Riga 1: emoji + nome + conferma */}
      <div className="flex gap-2 mb-2">
        <input type="text" value={goal.emoji} maxLength={2}
          onChange={e => onChange('emoji', e.target.value)}
          className={`${inputCls} w-10 text-center text-base shrink-0`} />
        <input type="text" value={goal.title} placeholder={t('goals.name')}
          onChange={e => onChange('title', e.target.value)}
          className={`${inputCls} flex-1 min-w-0`} />
        <button onClick={onDone}
          className="w-10 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}>
          <IoCheckmark size={16} />
        </button>
      </div>
      {/* Riga 2: obiettivo + unità */}
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={targetStr}
          placeholder={t('goals.targetPh')}
          onChange={handleTarget}
          className={`${inputCls} flex-1 min-w-0`}
        />
        <input type="text" value={goal.unit} placeholder={t('goals.unit')}
          onChange={e => onChange('unit', e.target.value)}
          className={`${inputCls} w-20 shrink-0`} />
      </div>
    </div>
  )
}

// ─── Form aggiunta ────────────────────────────────────────────────────────────
function AddGoalForm({ onAdd, onCancel }) {
  const { t } = useLang()
  const [draft, setDraft] = useState({ emoji: '🎯', title: '', target: '', unit: '' })
  const update = (f, v) => setDraft(p => ({ ...p, [f]: v }))

  function submit() {
    if (!draft.title.trim()) return
    onAdd({
      id: `g${Date.now()}`,
      emoji: draft.emoji || '🎯',
      title: draft.title.trim(),
      current: 0,
      target: parseFloat(draft.target) || 0,
      unit: draft.unit.trim(),
    })
  }

  return (
    <div className="bg-[var(--surface)] rounded-xl p-4 border border-[color:var(--border-2)]">
      <div className="flex gap-2 mb-3">
        <input type="text" value={draft.emoji} maxLength={2}
          onChange={e => update('emoji', e.target.value)}
          className="w-12 bg-[var(--surface-2)] border border-[color:var(--border-2)] rounded-lg px-2 py-2 text-center text-lg outline-none focus:border-[color:var(--border-4)]" />
        <input type="text" value={draft.title} placeholder={t('goals.goalName')}
          onChange={e => update('title', e.target.value)}
          className="flex-1 bg-[var(--surface-2)] border border-[color:var(--border-2)] rounded-lg px-3 py-2 text-sm text-[color:var(--text)] outline-none focus:border-[color:var(--border-4)]" />
      </div>
      <div className="flex gap-2 mb-3">
        <input type="number" value={draft.target} placeholder={t('goals.targetPh')}
          onChange={e => update('target', e.target.value)}
          className="flex-1 bg-[var(--surface-2)] border border-[color:var(--border-2)] rounded-lg px-3 py-2 text-sm text-[color:var(--text)] outline-none focus:border-[color:var(--border-4)]" />
        <input type="text" value={draft.unit} placeholder={t('goals.unitEx')}
          onChange={e => update('unit', e.target.value)}
          className="w-28 bg-[var(--surface-2)] border border-[color:var(--border-2)] rounded-lg px-3 py-2 text-sm text-[color:var(--text)] outline-none focus:border-[color:var(--border-4)]" />
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel}
          className="flex-1 py-2 rounded-xl text-sm text-[color:var(--text-muted)] border border-[color:var(--border-2)] hover:border-[color:var(--border-3)] transition-colors">
          {t('common.cancel')}
        </button>
        <button onClick={submit} disabled={!draft.title.trim()}
          className="flex-1 py-2 rounded-xl text-sm font-bold disabled:opacity-30"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}>
          {t('common.add')}
        </button>
      </div>
    </div>
  )
}

// ─── Pagina ───────────────────────────────────────────────────────────────────
function ImpostazioniObiettivi() {
  const navigate = useNavigate()
  const { t } = useLang()
  const [goals, setGoals] = useState(loadGoals)
  const [activeKey, setActiveKey] = useState('daily')
  const [editingId, setEditingId] = useState(null)
  const [addingSection, setAddingSection] = useState(null)
  const [saved, setSaved] = useState(false)

  function switchTab(key) {
    setActiveKey(key)
    setEditingId(null)       // chiude eventuale modifica aperta
    setAddingSection(null)   // chiude eventuale form aggiunta aperto
  }

  function updateGoal(category, id, field, value) {
    setGoals(prev => ({
      ...prev,
      [category]: prev[category].map(g => g.id === id ? { ...g, [field]: value } : g),
    }))
  }

  function deleteGoal(category, id) {
    setGoals(prev => ({ ...prev, [category]: prev[category].filter(g => g.id !== id) }))
    if (editingId === id) setEditingId(null)
  }

  function addGoal(category, goal) {
    setGoals(prev => ({ ...prev, [category]: [...prev[category], goal] }))
    setAddingSection(null)
  }

  function saveAll() {
    localStorage.setItem('fitpulse-goals', JSON.stringify(goals))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const activeSection = SECTIONS.find(s => s.key === activeKey)
  const list = goals[activeKey] ?? []
  const atMax = list.length >= MAX_GOALS

  return (
    <div className="flex flex-col pb-28">
      <TopBar title={t('title.goals')} onBack={() => navigate('/impostazioni')} />

      <div className="px-5 pt-5">
        <h2 className="text-2xl font-extrabold mb-1">{t('settings.goals.title')}</h2>
        <p className="text-[color:var(--text-muted)] text-sm mb-5">
          {t('goals.max', { max: MAX_GOALS })}
        </p>

        {/* Tab selector — stessa logica della Home */}
        <div className="grid grid-cols-3 gap-1 bg-[var(--surface)] rounded-xl p-1 mb-4">
          {SECTIONS.map(s => (
            <button
              key={s.key}
              onClick={() => switchTab(s.key)}
              className="py-2 rounded-lg text-xs font-semibold transition-all duration-200"
              style={
                activeKey === s.key
                  ? { backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }
                  : { color: 'var(--text-dim)' }
              }
            >
              {t(s.tabKey)}
            </button>
          ))}
        </div>

        {/* Contenuto sezione attiva */}
        <div key={activeKey}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-dim)]">
              {t(activeSection.labelKey)}
            </p>
            <span className="text-xs text-[color:var(--text-faint)]">{list.length}/{MAX_GOALS}</span>
          </div>

          <div className="flex flex-col gap-2">
            {list.map(goal =>
              editingId === goal.id ? (
                <GoalEditRow
                  key={goal.id}
                  goal={goal}
                  onChange={(f, v) => updateGoal(activeKey, goal.id, f, v)}
                  onDone={() => setEditingId(null)}
                />
              ) : (
                <GoalRow
                  key={goal.id}
                  goal={goal}
                  onEdit={() => setEditingId(goal.id)}
                  onDelete={() => deleteGoal(activeKey, goal.id)}
                />
              )
            )}

            {addingSection === activeKey ? (
              <AddGoalForm
                onAdd={goal => addGoal(activeKey, goal)}
                onCancel={() => setAddingSection(null)}
              />
            ) : !atMax ? (
              <button
                onClick={() => { setAddingSection(activeKey); setEditingId(null) }}
                className="flex items-center gap-2 text-[color:var(--text-dim)] hover:text-[color:var(--text)] text-sm py-2 transition-colors"
              >
                <IoAdd size={16} />
                <span>{t('goals.add')}</span>
              </button>
            ) : (
              <p className="text-xs text-[color:var(--text-faint)] py-1">
                {t('goals.limit', { max: MAX_GOALS })}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={saveAll}
          className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-widest mt-6"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          {saved ? t('common.saved') : t('goals.save')}
        </button>
      </div>
    </div>
  )
}

export default ImpostazioniObiettivi
