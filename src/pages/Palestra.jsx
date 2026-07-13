import { useState, useEffect } from 'react'
import { IoAdd, IoBarbell, IoChevronBack } from 'react-icons/io5'
import TopBar from '../components/TopBar'
import RestPicker from '../components/RestPicker'
import GiornataView from '../components/GiornataView'
import SchedaView from '../components/SchedaView'
import GiornataCard from '../components/GiornataCard'
import ConfirmModal from '../components/ConfirmModal'
import PromptModal from '../components/PromptModal'
import GiornataPickerModal from '../components/GiornataPickerModal'
import { useLang } from '../context/LanguageContext'
import { useTimer } from '../context/TimerContext'
import { loadGiornate, saveGiornate, DAYS, dayIndex, newId, loadWeeklyGoal, giornataName, schedaNameTaken } from '../data/giornateDefaults'
import { useWorkoutSync } from '../hooks/useWorkoutSync'
import { titleCase } from '../utils/text'

// Unisce schede in un contenitore: una incoming con lo stesso nome SOVRASCRIVE l'esistente
// (in-place), altrimenti viene aggiunta. Evita i duplicati per nome.
function mergeSchede(existing, incoming) {
  const key = s => (s.nome || '').trim().toLowerCase()
  const result = [...existing]
  for (const inc of incoming) {
    const idx = result.findIndex(s => key(s) === key(inc))
    if (idx >= 0) result[idx] = inc
    else result.push(inc)
  }
  return result
}

function mmss(total) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Barra di progresso singola (etichetta + percentuale + riempimento colorato).
function ProgressBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <p className="text-[color:var(--text-muted)] text-xs min-w-0">{label}</p>
        <span className="text-[10px] font-bold tabular-nums shrink-0" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2 bg-[var(--track)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function Palestra() {
  const { t } = useLang()
  const { restDuration } = useTimer()

  const [giornate, setGiornate] = useState(loadGiornate)
  // Giornata aperta persistita: al refresh/cambio pagina si resta sul dettaglio aperto.
  const [openId, setOpenId] = useState(() => localStorage.getItem('fitpulse-open-giornata') || null)
  const [menuId, setMenuId] = useState(null)       // menu tre-puntini giornata
  const [deleteId, setDeleteId] = useState(null)   // conferma eliminazione giornata
  const [pickerOpen, setPickerOpen] = useState(false) // menu "crea giornata"
  const [pickerMode, setPickerMode] = useState('root') // 'root' = scelta modalità · 'days' = scegli giorno
  const [customOpen, setCustomOpen] = useState(false)  // modale nome personalizzato
  const [moveCopy, setMoveCopy] = useState(null)   // { sourceId, mode:'copy'|'move' } → selettore destinazione
  const [overwrite, setOverwrite] = useState(null) // { mode, sourceId, targetId, name } → conferma sovrascrittura
  const [filter, setFilter] = useState('all')      // filtro card: 'all' | 'week' | 'plan'
  const [weeklyGoal] = useState(loadWeeklyGoal)    // obiettivo allenamenti/settimana (Impostazioni)

  // Ponte local-first: da loggato rispecchia le giornate su Supabase (no-op se non configurato).
  useWorkoutSync(giornate, setGiornate)

  const openGiornata = giornate.find(g => g.id === openId)

  // Persisti solo una giornata ESISTENTE: un id orfano (eliminata) non viene salvato.
  useEffect(() => {
    if (openGiornata) localStorage.setItem('fitpulse-open-giornata', openGiornata.id)
    else localStorage.removeItem('fitpulse-open-giornata')
  }, [openGiornata])

  // Doppio tap sulla voce Palestra della navbar → torna alla lista giornate.
  useEffect(() => {
    function onReset(e) {
      if (e.detail === '/palestra') {
        setOpenId(null); setMenuId(null); setDeleteId(null)
        setPickerOpen(false); setPickerMode('root'); setCustomOpen(false); setMoveCopy(null); setOverwrite(null)
      }
    }
    window.addEventListener('fitpulse-navreset', onReset)
    return () => window.removeEventListener('fitpulse-navreset', onReset)
  }, [])

  function commit(next) {
    setGiornate(next)
    saveGiornate(next)
  }

  // Crea una giornata (per-giorno o con nome libero), chiude i menu e la apre subito.
  function addGiornata(extra) {
    const nuova = { id: newId(), schede: [], ...extra }
    commit([...giornate, nuova])
    setPickerOpen(false); setPickerMode('root'); setCustomOpen(false)
    setOpenId(nuova.id)
  }
  const createGiornataDay = day => addGiornata({ day })
  // Giornata personalizzata = un unico allenamento: nasce con una scheda implicita e
  // si apre direttamente sugli esercizi (niente livello "crea scheda").
  const createGiornataCustom = raw => {
    const nome = titleCase(raw)
    addGiornata({ nome, custom: true, schede: [{ id: newId(), nome, esercizi: [], custom: true }] })
  }

  // Rinomina una giornata personalizzata (tiene in sync anche la sua scheda implicita).
  function renameGiornata(giornataId, nome) {
    commit(giornate.map(g => (g.id === giornataId
      ? { ...g, nome, schede: g.schede.map((s, i) => (i === 0 ? { ...s, nome } : s)) }
      : g)))
  }
  // Aggiorna gli esercizi della scheda implicita di una giornata personalizzata.
  function setCustomExercises(giornataId, esercizi) {
    commit(giornate.map(g => {
      if (g.id !== giornataId) return g
      const first = g.schede[0]
      const scheda = first ? { ...first, esercizi } : { id: newId(), nome: g.nome || '', esercizi }
      return { ...g, schede: [scheda, ...g.schede.slice(1)] }
    }))
  }
  // Prossima lettera libera per "Scheda A/B/C…" (max 7 giornate → A–G)
  function createGiornataLetter() {
    const prefix = t('palestra.schedaLetter')
    const used = new Set(giornate.map(g => g.nome).filter(Boolean))
    let name = `${prefix} ${giornate.length + 1}`
    for (let i = 0; i < 26; i++) {
      const candidate = `${prefix} ${String.fromCharCode(65 + i)}`
      if (!used.has(candidate)) { name = candidate; break }
    }
    addGiornata({ nome: name })
  }
  function setSchede(giornataId, schede) {
    commit(giornate.map(g => (g.id === giornataId ? { ...g, schede } : g)))
  }
  function confirmDelete() {
    commit(giornate.filter(g => g.id !== deleteId))
    if (openId === deleteId) setOpenId(null)
    setDeleteId(null)
  }
  // Swipe sulla card: marca la giornata completata/saltata (toggle, come gli esercizi).
  function toggleStato(id, target) {
    commit(giornate.map(g => (g.id === id ? { ...g, stato: g.stato === target ? undefined : target } : g)))
  }

  // Copia/Sposta le SCHEDE di una giornata personalizzata in un'altra giornata.
  // I cloni ricevono nuovi id (schede + esercizi) per non collidere con gli originali.
  const cloneSchede = schede =>
    schede.map(s => ({ ...s, id: newId(), esercizi: (s.esercizi || []).map(e => ({ ...e, id: newId() })) }))

  function copySchede(sourceId, targetId) {
    const source = giornate.find(g => g.id === sourceId)
    if (!source) return
    const clones = cloneSchede(source.schede)
    commit(giornate.map(g => (g.id === targetId ? { ...g, schede: mergeSchede(g.schede, clones) } : g)))
  }
  function moveSchede(sourceId, targetId) {
    const source = giornate.find(g => g.id === sourceId)
    if (!source) return
    commit(
      giornate
        .map(g => (g.id === targetId ? { ...g, schede: mergeSchede(g.schede, source.schede) } : g))
        .filter(g => g.id !== sourceId), // Sposta: la giornata personalizzata sorgente viene rimossa
    )
    if (openId === sourceId) setOpenId(null)
  }

  // Copia/Sposta UNA scheda portabile (custom) da un giorno a un altro contenitore.
  function copySchedaTo(scheda, targetId) {
    const clone = cloneSchede([scheda])[0]
    commit(giornate.map(g => (g.id === targetId ? { ...g, schede: mergeSchede(g.schede, [clone]) } : g)))
  }
  function moveSchedaTo(sourceGiornataId, scheda, targetId) {
    commit(giornate.map(g => {
      if (g.id === sourceGiornataId) return { ...g, schede: g.schede.filter(s => s.id !== scheda.id) }
      if (g.id === targetId) return { ...g, schede: mergeSchede(g.schede, [scheda]) }
      return g
    }))
  }

  // Copia/Sposta a livello di giornata custom: chiede conferma se c'è un nome già presente.
  function runGiornataOp(mode, sourceId, targetId) {
    if (mode === 'copy') copySchede(sourceId, targetId)
    else moveSchede(sourceId, targetId)
  }
  function tryGiornataOp(mode, sourceId, targetId) {
    const source = giornate.find(g => g.id === sourceId)
    const target = giornate.find(g => g.id === targetId)
    const clash = source && target && source.schede.find(s => schedaNameTaken(target.schede, s.nome))
    setMoveCopy(null)
    if (clash) setOverwrite({ mode, sourceId, targetId, name: clash.nome })
    else runGiornataOp(mode, sourceId, targetId)
  }
  // Riporta una scheda portabile nella sezione Personalizzate (nuova giornata custom).
  function schedaToTopLevel(sourceGiornataId, scheda, mode) {
    const inner = mode === 'copy' ? cloneSchede([scheda])[0] : scheda
    const nuova = { id: newId(), custom: true, nome: scheda.nome || t('palestra.newDefault'), schede: [{ ...inner, custom: true }] }
    let next = [...giornate, nuova]
    if (mode === 'move') next = next.map(g => (g.id === sourceGiornataId ? { ...g, schede: g.schede.filter(s => s.id !== scheda.id) } : g))
    commit(next)
  }

  // Gruppi per il filtro: settimanali (Lun→Dom), schede-lettera (A→Z), personalizzate (alfabetico).
  const weekG = giornate.filter(g => g.day).sort((a, b) => dayIndex(a.day) - dayIndex(b.day))
  const letterG = giornate.filter(g => !g.day && !g.custom).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
  const customG = giornate.filter(g => g.custom).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
  const usedDays = new Set(giornate.map(g => g.day).filter(Boolean))
  const availableDays = DAYS.filter(d => !usedDays.has(d.key))
  const canAdd = giornate.length < 7 // massimo 7 giornate
  const deletingGiornata = giornate.find(g => g.id === deleteId)

  // Dettaglio giornata come PAGINA interna (non una rotta, non una modale)
  if (openGiornata) {
    // Giornata personalizzata → dritti agli esercizi (scheda implicita, niente lista schede)
    if (openGiornata.custom) {
      const scheda = openGiornata.schede[0] || { id: openGiornata.id, nome: openGiornata.nome || '', esercizi: [] }
      return (
        <SchedaView
          scheda={scheda}
          restLabel={mmss(restDuration)}
          onRename={(_id, nome) => renameGiornata(openGiornata.id, nome)}
          onExercisesChange={arr => setCustomExercises(openGiornata.id, arr)}
          onBack={() => setOpenId(null)}
        />
      )
    }
    return (
      <GiornataView
        giornata={openGiornata}
        allGiornate={giornate}
        onSchedeChange={arr => setSchede(openGiornata.id, arr)}
        onBack={() => setOpenId(null)}
        onSchedaCopyTo={(scheda, targetId) => copySchedaTo(scheda, targetId)}
        onSchedaMoveTo={(scheda, targetId) => moveSchedaTo(openGiornata.id, scheda, targetId)}
        onSchedaToTopLevel={(scheda, mode) => schedaToTopLevel(openGiornata.id, scheda, mode)}
      />
    )
  }

  // Statistiche progresso settimanale (dallo stato corrente delle giornate: swipe done/skip)
  const totalDays = giornate.length
  const doneDays = giornate.filter(g => g.stato === 'done').length
  const skipDays = giornate.filter(g => g.stato === 'skip').length

  // Giornata sorgente del selettore copia/sposta (se aperto)
  const moveSource = moveCopy && giornate.find(g => g.id === moveCopy.sourceId)

  const renderCard = g => (
    <GiornataCard
      key={g.id}
      giornata={g}
      menuOpen={menuId === g.id}
      onToggleMenu={() => setMenuId(menuId === g.id ? null : g.id)}
      onDelete={() => { setMenuId(null); setDeleteId(g.id) }}
      onOpen={() => setOpenId(g.id)}
      onToggleStato={target => toggleStato(g.id, target)}
      onCopy={() => { setMenuId(null); setMoveCopy({ sourceId: g.id, mode: 'copy' }) }}
      onMove={() => { setMenuId(null); setMoveCopy({ sourceId: g.id, mode: 'move' }) }}
    />
  )

  const FILTERS = [['all', 'palestra.filterAll'], ['week', 'palestra.filterWeek'], ['plan', 'palestra.filterPlan']]

  return (
    <div className="flex flex-col pb-24">

      <TopBar icon={IoBarbell} title={t('title.myworkout')} />

      {/* Section Header: a destra il timer (sopra) e il tasto "crea giornata" (sotto, allineato) */}
      <div className="px-5 pt-2 pb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-3xl font-extrabold leading-tight">
            {t('palestra.title')}
          </h2>
          <p className="text-[color:var(--text-muted)] text-sm mt-4">
            {t('palestra.subtitle')}
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 shrink-0">
          {/* Selettore recupero: scrive il valore condiviso usato da Recupero */}
          <RestPicker />

          {/* Crea giornata: allineato verticalmente sotto il timer, sulla linea del sottotitolo */}
          <div className="relative mt-2">
            <button
              onClick={() => { if (canAdd) { setPickerMode('root'); setPickerOpen(o => !o) } }}
              disabled={!canAdd}
              aria-label={t('palestra.newDay')}
              title={!canAdd ? t('palestra.allDaysUsed') : t('palestra.newDay')}
              className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              <IoAdd className="text-xl" />
            </button>

            {/* Popover a due livelli: modalità di creazione → (eventuale) scelta del giorno */}
            {pickerOpen && canAdd && (
              <div
                className="absolute right-0 top-10 z-40 w-56 rounded-xl bg-[var(--surface)] border border-[color:var(--border-2)] shadow-xl overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                {pickerMode === 'root' ? (
                  <>
                    <button
                      onClick={() => setPickerMode('days')}
                      disabled={availableDays.length === 0}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--surface-3)] transition-colors disabled:opacity-40"
                    >
                      {t('palestra.byDay')}
                    </button>
                    <button
                      onClick={createGiornataLetter}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--surface-3)] transition-colors"
                    >
                      {t('palestra.byLetter')}
                    </button>
                    <button
                      onClick={() => { setPickerOpen(false); setCustomOpen(true) }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--surface-3)] transition-colors"
                    >
                      {t('palestra.byCustom')}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setPickerMode('root')}
                      className="w-full flex items-center gap-1 px-4 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-[color:var(--text-dim)] hover:text-[color:var(--text)] transition-colors"
                    >
                      <IoChevronBack /> {t('palestra.pickDay')}
                    </button>
                    {availableDays.map(d => (
                      <button
                        key={d.key}
                        onClick={() => createGiornataDay(d.key)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--surface-3)] transition-colors"
                      >
                        {t(d.labelKey)}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filtro: Tutte / Settimanale / Scheda */}
      <div className="px-5 mb-4">
        <div className="grid grid-cols-3 gap-1 bg-[var(--surface)] rounded-xl p-1">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="py-2 rounded-lg text-xs font-semibold transition-all duration-200"
              style={filter === key ? { backgroundColor: 'var(--accent)', color: 'var(--on-accent)' } : { color: 'var(--text-dim)' }}
            >
              {t(label)}
            </button>
          ))}
        </div>
      </div>

      {/* Giornate (raggruppate in "Tutte", filtrate altrimenti) */}
      <div className="px-5 flex flex-col gap-3">
        {giornate.length === 0 ? (
          <p className="text-[color:var(--text-dim)] text-sm text-center py-10">{t('palestra.noGiornate')}</p>
        ) : filter === 'week' ? (
          weekG.length ? weekG.map(renderCard) : <p className="text-[color:var(--text-dim)] text-sm text-center py-10">{t('palestra.noGiornate')}</p>
        ) : filter === 'plan' ? (
          letterG.length ? letterG.map(renderCard) : <p className="text-[color:var(--text-dim)] text-sm text-center py-10">{t('palestra.noGiornate')}</p>
        ) : (
          <>
            {weekG.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-dim)] mt-1">{t('palestra.sectionWeekly')}</p>
                {weekG.map(renderCard)}
              </div>
            )}
            {letterG.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-dim)] mt-1">{t('palestra.sectionPlans')}</p>
                {letterG.map(renderCard)}
              </div>
            )}
            {customG.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-dim)] mt-1">{t('palestra.sectionCustom')}</p>
                {customG.map(renderCard)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Progresso settimanale: 3 barre (completati / esercizi saltati / obiettivo) */}
      <div className="px-5 mt-5">
        <div className="bg-[var(--surface)] rounded-xl p-4 flex flex-col gap-4">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
            {t('palestra.weeklyProgress')}
          </p>
          <ProgressBar
            label={t('palestra.completed', { done: doneDays, total: totalDays })}
            value={doneDays} total={totalDays} color="var(--accent)"
          />
          <ProgressBar
            label={t('palestra.skipped', { done: skipDays, total: totalDays })}
            value={skipDays} total={totalDays} color="#ef4444"
          />
          <ProgressBar
            label={t('palestra.goalProgress', { done: doneDays, goal: weeklyGoal })}
            value={doneDays} total={weeklyGoal} color="#22c55e"
          />
        </div>
      </div>

      {/* Backdrop invisibile: un tap fuori chiude menu tre-puntini o selettore giorno */}
      {(menuId || pickerOpen) && (
        <div className="fixed inset-0 z-20" onClick={() => { setMenuId(null); setPickerOpen(false); setPickerMode('root') }} />
      )}

      {/* Conferma eliminazione giornata */}
      {deletingGiornata && (
        <ConfirmModal
          title={t('confirm.deleteGiornata', { name: giornataName(deletingGiornata, t) })}
          message={t('confirm.irreversible')}
          confirmLabel={t('menu.delete')}
          cancelLabel={t('common.cancel')}
          danger
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {/* Modale nome personalizzato per la nuova giornata */}
      {customOpen && (
        <PromptModal
          title={t('palestra.customTitle')}
          placeholder={t('palestra.customPlaceholder')}
          confirmLabel={t('common.create')}
          cancelLabel={t('common.cancel')}
          onConfirm={createGiornataCustom}
          onCancel={() => setCustomOpen(false)}
        />
      )}

      {/* Selettore destinazione per Copia in / Sposta in (giornate personalizzate) */}
      {moveCopy && moveSource && (
        <GiornataPickerModal
          title={t(moveCopy.mode === 'copy' ? 'move.copyTitle' : 'move.moveTitle', { name: giornataName(moveSource, t) })}
          giornate={giornate.filter(g => g.id !== moveCopy.sourceId && !g.custom)}
          onPick={id => tryGiornataOp(moveCopy.mode, moveCopy.sourceId, id)}
          onCancel={() => setMoveCopy(null)}
        />
      )}

      {/* Conferma sovrascrittura: la destinazione ha già una scheda con lo stesso nome */}
      {overwrite && (
        <ConfirmModal
          title={t('confirm.overwriteTitle')}
          message={t('confirm.overwriteMsg', { name: overwrite.name })}
          confirmLabel={t('common.yes')}
          cancelLabel={t('common.no')}
          onConfirm={() => { runGiornataOp(overwrite.mode, overwrite.sourceId, overwrite.targetId); setOverwrite(null) }}
          onCancel={() => setOverwrite(null)}
        />
      )}

    </div>
  )
}

export default Palestra
