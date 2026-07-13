import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoBodyOutline, IoAdd, IoTrashOutline } from 'react-icons/io5'
import TopBar from '../components/TopBar'
import BodyMeasuresEditor from '../components/BodyMeasuresEditor'
import ConfirmModal from '../components/ConfirmModal'
import { useLang } from '../context/LanguageContext'
import {
  MEASURE_FIELDS, loadMeasures, saveMeasures, upsertEntry, removeEntry,
  latestValues, newMeasureId, todayISO,
} from '../data/bodyMeasuresDefaults'

const isSet = v => v !== undefined && v !== null && v !== ''

const newEntry = () => ({ id: newMeasureId(), date: todayISO(), values: {} })

function unitLabel(unit, t) {
  if (unit === 'kg') return t('weight.kg')
  if (unit === '%') return t('body.pct')
  return t('body.cm')
}

function MisureCorporee() {
  const navigate = useNavigate()
  const { t, lang } = useLang()

  const [entries, setEntries] = useState(loadMeasures)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  function commit(next) {
    setEntries(next)
    saveMeasures(next)
  }

  function save(entry) {
    commit(upsertEntry(entries, entry))
    setEditing(null)
  }

  function remove(id) {
    commit(removeEntry(entries, id))
    setDeleting(null)
  }

  const latest = latestValues(entries)
  const latestFields = MEASURE_FIELDS.filter(f => latest[f.key])
  const fmtDate = d => new Date(d).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' })
  // Anteprima compatta dei primi valori registrati nello snapshot.
  const entryPreview = e => {
    const set = MEASURE_FIELDS.filter(f => isSet(e.values?.[f.key]))
    const shown = set.slice(0, 3).map(f => `${t(f.labelKey)} ${e.values[f.key]}`).join(' · ')
    return set.length > 3 ? `${shown} …` : shown
  }

  return (
    <div className="flex flex-col pb-28">
      <TopBar icon={IoBodyOutline} title={t('title.body')} onBack={() => navigate('/profilo')} />

      <div className="px-5 pt-4">
        <h2 className="text-2xl font-extrabold mb-1">{t('body.h2')}</h2>
        <p className="text-[color:var(--text-muted)] text-sm mb-5">{t('body.subtitle')}</p>

        {latestFields.length > 0 && (
          <div className="rounded-2xl bg-[var(--surface)] border border-[color:var(--border-1)] p-4 mb-5">
            <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-dim)] mb-3">{t('body.latest')}</p>
            <div className="grid grid-cols-2 gap-3">
              {latestFields.map(f => (
                <div key={f.key}>
                  <p className="text-[color:var(--text-dim)] text-xs">{t(f.labelKey)}</p>
                  <p className="font-bold tabular-nums">
                    {latest[f.key].value}
                    <span className="text-[color:var(--text-dim)] font-normal text-xs"> {unitLabel(f.unit, t)}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setEditing(newEntry())}
          className="w-full rounded-xl py-3 font-bold flex items-center justify-center gap-2 mb-5"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          <IoAdd className="text-xl" />
          {t('body.add')}
        </button>

        {entries.length === 0 ? (
          <p className="text-[color:var(--text-faint)] text-sm py-6 text-center">{t('body.empty')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-dim)] mb-1">{t('body.history')}</p>
            {[...entries].reverse().map(e => (
              <div key={e.id} className="flex items-center gap-3 rounded-xl bg-[var(--surface)] border border-[color:var(--border-1)] px-3 py-2.5">
                <button onClick={() => setEditing(e)} className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium capitalize">{fmtDate(e.date)}</p>
                  <p className="text-xs text-[color:var(--text-dim)] truncate">{entryPreview(e)}</p>
                </button>
                <button
                  onClick={() => setDeleting(e)}
                  aria-label={t('body.delete')}
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
        <BodyMeasuresEditor
          key={editing.id}
          entry={editing}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      )}

      {deleting && (
        <ConfirmModal
          title={t('body.delete')}
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

export default MisureCorporee
