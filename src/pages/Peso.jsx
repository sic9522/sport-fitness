import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoScaleOutline, IoAdd, IoTrashOutline, IoArrowDown, IoArrowUp } from 'react-icons/io5'
import TopBar from '../components/TopBar'
import WeightChart from '../components/WeightChart'
import WeightEditor from '../components/WeightEditor'
import ConfirmModal from '../components/ConfirmModal'
import { useLang } from '../context/LanguageContext'
import {
  loadWeights, saveWeights, upsertEntry, removeEntry,
  latestEntry, weightDelta, newWeightId, todayISO,
} from '../data/weightDefaults'

// Bozza di nuova misura (id/data generati in handler, non in render).
const newEntry = () => ({ id: newWeightId(), date: todayISO(), kg: '' })

function Peso() {
  const navigate = useNavigate()
  const { t, lang } = useLang()

  const [entries, setEntries] = useState(loadWeights)
  const [editing, setEditing] = useState(null)  // entry → WeightEditor
  const [deleting, setDeleting] = useState(null) // entry → ConfirmModal

  function commit(next) {
    setEntries(next)
    saveWeights(next)
  }

  function save(entry) {
    commit(upsertEntry(entries, entry))
    setEditing(null)
  }

  function remove(id) {
    commit(removeEntry(entries, id))
    setDeleting(null)
  }

  const latest = latestEntry(entries)
  const delta = weightDelta(entries)
  const fmtDate = d => new Date(d).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="flex flex-col pb-28">
      <TopBar icon={IoScaleOutline} title={t('title.weight')} onBack={() => navigate('/profilo')} />

      <div className="px-5 pt-4">
        <h2 className="text-2xl font-extrabold mb-1">{t('weight.h2')}</h2>
        <p className="text-[color:var(--text-muted)] text-sm mb-5">{t('weight.subtitle')}</p>

        {entries.length === 0 ? (
          <p className="text-[color:var(--text-faint)] text-sm py-6 text-center">{t('weight.empty')}</p>
        ) : (
          <div className="rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-4 mb-5">
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-[color:var(--text-dim)] mb-1">{t('weight.current')}</p>
                <p className="text-3xl font-extrabold tabular-nums">
                  {latest.kg}<span className="text-base font-semibold text-[color:var(--text-dim)]"> {t('weight.kg')}</span>
                </p>
              </div>
              {delta !== null && delta !== 0 && (
                <div className="flex items-center gap-1 text-sm font-semibold text-[color:var(--text-muted)]">
                  {delta < 0 ? <IoArrowDown /> : <IoArrowUp />}
                  <span className="tabular-nums">{Math.abs(delta)} {t('weight.kg')}</span>
                </div>
              )}
            </div>
            <WeightChart entries={entries} unit={t('weight.kg')} />
          </div>
        )}

        <button
          onClick={() => setEditing(newEntry())}
          className="w-full rounded-xl py-3 font-bold flex items-center justify-center gap-2 mb-5"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          <IoAdd className="text-xl" />
          {t('weight.add')}
        </button>

        {entries.length > 0 && (
          <div className="flex flex-col gap-2">
            {[...entries].reverse().map(e => (
              <div key={e.id} className="flex items-center gap-3 rounded-xl bg-[var(--surface)] border border-[color:var(--border-1)] px-3 py-2.5">
                <button onClick={() => setEditing(e)} className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium capitalize">{fmtDate(e.date)}</p>
                </button>
                <span className="text-sm font-bold tabular-nums shrink-0">
                  {e.kg}<span className="text-[color:var(--text-dim)] font-normal text-xs"> {t('weight.kg')}</span>
                </span>
                <button
                  onClick={() => setDeleting(e)}
                  aria-label={t('weight.delete')}
                  className="text-[color:var(--text-faint)] hover:text-red-400 transition-colors shrink-0"
                >
                  <IoTrashOutline className="text-lg" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <WeightEditor
          key={editing.id}
          entry={editing}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      )}

      {deleting && (
        <ConfirmModal
          title={t('weight.delete')}
          message={fmtDate(deleting.date)}
          confirmLabel={t('common.yes')}
          cancelLabel={t('common.no')}
          danger
          onConfirm={() => remove(deleting.id)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

export default Peso
