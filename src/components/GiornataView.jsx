import { useState, useEffect, useSyncExternalStore } from 'react'
import { IoAdd, IoEllipsisVertical, IoCreateOutline, IoTrashOutline, IoCopyOutline, IoArrowRedoOutline, IoCheckmark, IoClose } from 'react-icons/io5'
import TopBar from './TopBar'
import SchedaView from './SchedaView'
import ConfirmModal from './ConfirmModal'
import PromptModal from './PromptModal'
import GiornataPickerModal from './GiornataPickerModal'
import { useLang } from '../context/LanguageContext'
import { giornataName, newId, schedaNameTaken } from '../data/giornateDefaults'
import { titleCase } from '../utils/text'
import {
  schedaSummary, formatDuration, formatClock, formatDayMonth,
  completionRatio, COMPLETION_THRESHOLD, exerciseTotal,
} from '../data/schedaStats'
import { subscribeSchedaProgress, getSchedaProgress, schedaEntry } from '../data/schedaProgress'

// Badge: ESERCIZI COMPLETATI sul totale. Misura una cosa sola — quanti esercizi sono
// stati portati a termine — ed e' volutamente indipendente dalla percentuale di
// completamento mostrata nel riepilogo, che invece pesa le ripetizioni. Le due cifre
// possono divergere (4/8 esercizi ma 75% di lavoro svolto) ed e' corretto che lo facciano:
// rispondono a domande diverse.
//
// Il colore segue la quota di esercizi rispetto alla soglia. Sobrio di proposito: fondo
// tinto al 14%, bordo al 45%. La card resta la protagonista, il badge e' una chiosa.
function CompletionBadge({ done, total }) {
  const ok = completionRatio(done, total) >= COMPLETION_THRESHOLD
  const color = ok ? '#22c55e' : '#ef4444'
  const Icon = ok ? IoCheckmark : IoClose

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full pl-1 pr-2 py-0.5 text-[11px] font-bold tabular-nums leading-none"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 45%, transparent)`,
      }}
    >
      <Icon className="text-sm shrink-0" />
      {done}/{total}
    </span>
  )
}

// Il badge compare SOLO dopo almeno un allenamento. Su una scheda mai svolta un rosso
// allo 0% direbbe "sei andato male" quando la verita' e' "non l'hai ancora provata":
// sarebbe un giudizio su qualcosa che non e' successo.
function SchedaBadge({ scheda, progress }) {
  const last = schedaEntry(progress, scheda.id)
  if (!last.at) return null
  return <CompletionBadge done={last.exercises} total={exerciseTotal(scheda)} />
}

// Una voce del riepilogo: etichetta smorzata sopra il valore in evidenza. Le due colonne
// condividono lo stesso componente, cosi' restano allineate senza aggiustamenti a mano.
function Stat({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] uppercase tracking-wider text-[color:var(--text-faint)] truncate">
        {label}
      </span>
      <span className="text-xs font-bold tabular-nums shrink-0">{value}</span>
    </div>
  )
}

// Riepilogo della scheda su DUE colonne:
//   sinistra = cosa PREVEDE il piano (dati teorici, sempre disponibili);
//   destra   = com'e' andata l'ULTIMA volta (dati misurati, assenti finche' non ci si allena).
// Tenerle separate evita di confondere una stima con una misura: sono numeri diversi
// per natura, e affiancarli sulla stessa riga li avrebbe fatti sembrare confrontabili.
function SchedaSummary({ scheda, progress, t }) {
  const plan = schedaSummary(scheda)
  const last = schedaEntry(progress, scheda.id)

  // L'esito registrato puo' superare il totale se la scheda e' stata alleggerita dopo
  // l'ultimo allenamento: si mostra al massimo il totale, non un 140/132.
  const doneReps = Math.min(last.reps, plan.reps)
  const doneEx = Math.min(last.exercises, plan.exercises)
  const lastDay = formatDayMonth(last.at)

  return (
    <div className="mt-2 grid grid-cols-2 gap-x-5 gap-y-1">
      {/* Colonna 1: il piano, piu' il completamento in percentuale — la cifra esatta
          dietro al simbolo del badge. */}
      <div className="flex flex-col gap-1">
        <Stat label={t('scheda.exercises')} value={plan.exercises} />
        <Stat label={t('scheda.reps')} value={plan.reps} />
        <Stat label={t('scheda.estimate')} value={formatDuration(plan.seconds)} />
        {/* Avanzamento REALE della sessione: si pesa sulle RIPETIZIONI, non sugli
            esercizi. Cosi' un esercizio lasciato a meta' contribuisce comunque con il
            lavoro gia' fatto, invece di sparire come farebbe un conteggio per esercizi. */}
        <Stat
          label={t('scheda.completion')}
          value={`${Math.round(completionRatio(doneReps, plan.reps) * 100)}%`}
        />
      </div>

      {/* Colonna 2: l'ultima esecuzione. Senza sessioni svolte i valori restano a "—",
          che dice "non ancora fatto" senza far sembrare che valgano zero. */}
      <div className="flex flex-col gap-1">
        <Stat label={t('scheda.doneExercises')} value={`${doneEx}/${plan.exercises}`} />
        <Stat label={t('scheda.doneReps')} value={`${doneReps}/${plan.reps}`} />
        <Stat label={t('scheda.duration')} value={lastDay ? formatClock(last.seconds) : '—'} />
        <Stat label={t('scheda.lastSession')} value={lastDay || '—'} />
      </div>
    </div>
  )
}

// Pagina interna (NON una rotta) di una giornata: elenca le sue schede e apre SchedaView.
function GiornataView({ giornata, allGiornate, onSchedeChange, onBack, onSchedaCopyTo, onSchedaMoveTo, onSchedaToTopLevel }) {
  const { t } = useLang()
  const schede = giornata.schede

  // Avanzamento dell'ultima sessione. Lo store notifica da solo a ogni serie completata,
  // quindi la riga si aggiorna mentre ci si allena (player in background) e appena finisce.
  const progress = useSyncExternalStore(subscribeSchedaProgress, getSchedaProgress)

  // Scheda (esercizi) aperta, persistita: al refresh/cambio pagina si resta sul dettaglio.
  const [openId, setOpenId] = useState(() => localStorage.getItem('fitpulse-open-scheda') || null)
  const [menuId, setMenuId] = useState(null)     // menu tre-puntini aperto
  const [deleteId, setDeleteId] = useState(null) // conferma eliminazione
  const [schedaMC, setSchedaMC] = useState(null) // { scheda, mode:'copy'|'move' } → selettore destinazione
  const [schedaOverwrite, setSchedaOverwrite] = useState(null) // { scheda, mode, targetId } → conferma sovrascrittura
  const [creating, setCreating] = useState(false) // modale "nuova scheda": chiede il nome

  const openScheda = schede.find(s => s.id === openId)

  // Persisti solo una scheda ESISTENTE (id orfano → non salvato).
  useEffect(() => {
    if (openScheda) localStorage.setItem('fitpulse-open-scheda', openScheda.id)
    else localStorage.removeItem('fitpulse-open-scheda')
  }, [openScheda])

  // Doppio tap sulla voce Palestra della navbar → chiudi anche la scheda aperta.
  useEffect(() => {
    function onReset(e) {
      if (e.detail === '/palestra') {
        localStorage.removeItem('fitpulse-open-scheda')
        setOpenId(null); setMenuId(null); setDeleteId(null); setSchedaMC(null); setSchedaOverwrite(null)
      }
    }
    window.addEventListener('fitpulse-navreset', onReset)
    return () => window.removeEventListener('fitpulse-navreset', onReset)
  }, [])

  // Il nome si sceglie QUI, alla creazione (modale): dentro la scheda aperta è in sola lettura.
  function confirmCreate(nome) {
    const nuova = { id: newId(), nome: titleCase(nome), esercizi: [] }
    onSchedeChange([...schede, nuova])
    setCreating(false)
    setOpenId(nuova.id)
  }
  function setEsercizi(id, esercizi) {
    onSchedeChange(schede.map(s => (s.id === id ? { ...s, esercizi } : s)))
  }
  // Recupero indipendente per scheda (stesso pattern di setEsercizi).
  function setRest(id, rest) {
    onSchedeChange(schede.map(s => (s.id === id ? { ...s, rest } : s)))
  }
  function confirmDelete() {
    onSchedeChange(schede.filter(s => s.id !== deleteId))
    if (openId === deleteId) setOpenId(null)
    setDeleteId(null)
  }
  function closeScheda() {
    // Nome obbligatorio: se resta vuoto non si salva.
    const s = openId && schede.find(x => x.id === openId)
    if (s && !s.nome.trim()) {
      if (s.esercizi.length === 0) {
        onSchedeChange(schede.filter(x => x.id !== openId))       // scheda vuota e senza nome → scartata
      } else {
        onSchedeChange(schede.map(x => (x.id === openId ? { ...x, nome: t('palestra.newDefault') } : x))) // ha esercizi → non li perdo
      }
    }
    setOpenId(null)
  }

  const deletingScheda = schede.find(s => s.id === deleteId)

  // Scheda aperta → mostra i suoi esercizi (SchedaView)
  if (openScheda) {
    return (
      <SchedaView
        scheda={openScheda}
        onExercisesChange={arr => setEsercizi(openScheda.id, arr)}
        onRestChange={rest => setRest(openScheda.id, rest)}
        onBack={closeScheda}
      />
    )
  }

  return (
    <div className="flex flex-col pb-24">
      <TopBar onBack={onBack} title={giornataName(giornata, t).toUpperCase()} />

      {/* Schede della giornata */}
      <div className="px-5 pt-3 flex flex-col gap-3">
        {schede.length === 0 ? (
          <p className="text-[color:var(--text-dim)] text-sm text-center py-10">{t('palestra.noSchede')}</p>
        ) : (
          schede.map(scheda => (
            <div key={scheda.id} className="relative">
              <div
                onClick={() => setOpenId(scheda.id)}
                className="relative rounded-xl overflow-hidden bg-gradient-to-r from-gray-900 to-gray-800 cursor-pointer"
              >
                <div className="absolute inset-0 bg-black/40" />
                <div className="relative p-4">
                  {/* Tre colonne di larghezza fissa ai lati: il titolo cade al CENTRO
                      esatto della card, non al centro dello spazio residuo. */}
                  <div className="grid grid-cols-[4.25rem_1fr_4.25rem] items-center gap-2">
                    <div className="flex justify-start">
                      <SchedaBadge scheda={scheda} progress={progress} />
                    </div>
                    <span className="font-bold text-xl text-center truncate">
                      {scheda.nome || t('palestra.newDefault')}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); setMenuId(menuId === scheda.id ? null : scheda.id) }}
                      className="justify-self-end text-[color:var(--text-dim)] p-1 hover:text-[color:var(--text)] transition-colors"
                    >
                      <IoEllipsisVertical />
                    </button>
                  </div>
                  <SchedaSummary scheda={scheda} progress={progress} t={t} />
                </div>
              </div>

              {/* Menu tre-puntini */}
              {menuId === scheda.id && (
                <div
                  className="absolute right-2 top-11 z-30 w-44 rounded-xl bg-[var(--surface)] border border-[color:var(--border-2)] shadow-xl overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => { setMenuId(null); setOpenId(scheda.id) }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-[var(--surface-3)] transition-colors"
                  >
                    <IoCreateOutline className="text-base" />
                    {t('menu.edit')}
                  </button>
                  {/* Scheda portabile (arrivata da una personalizzata): copiabile/spostabile altrove */}
                  {scheda.custom && (
                    <>
                      <button
                        onClick={() => { setMenuId(null); setSchedaMC({ scheda, mode: 'copy' }) }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-[var(--surface-3)] transition-colors"
                      >
                        <IoCopyOutline className="text-base" />
                        {t('menu.copyTo')}
                      </button>
                      <button
                        onClick={() => { setMenuId(null); setSchedaMC({ scheda, mode: 'move' }) }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-[var(--surface-3)] transition-colors"
                      >
                        <IoArrowRedoOutline className="text-base" />
                        {t('menu.moveTo')}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => { setMenuId(null); setDeleteId(scheda.id) }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-[var(--surface-3)] transition-colors"
                    style={{ color: '#ef4444' }}
                  >
                    <IoTrashOutline className="text-base" />
                    {t('menu.delete')}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Crea nuova scheda */}
      <div className="px-5 mt-3">
        <button
          onClick={() => setCreating(true)}
          className="w-full rounded-xl py-4 flex items-center justify-center gap-2 font-bold tracking-widest uppercase text-sm"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          <IoAdd className="text-xl" />
          {t('palestra.newCard')}
        </button>
      </div>

      {/* Nuova scheda: il nome si sceglie qui (dentro la scheda è in sola lettura) */}
      {creating && (
        <PromptModal
          title={t('palestra.newCard')}
          placeholder={t('palestra.schedaPlaceholder')}
          confirmLabel={t('common.create')}
          cancelLabel={t('common.cancel')}
          onConfirm={confirmCreate}
          onCancel={() => setCreating(false)}
        />
      )}

      {/* Backdrop: un tap fuori chiude il menu tre-puntini */}
      {menuId && <div className="fixed inset-0 z-20" onClick={() => setMenuId(null)} />}

      {/* Conferma eliminazione scheda */}
      {deletingScheda && (
        <ConfirmModal
          title={t('confirm.deleteScheda', { name: deletingScheda.nome || t('palestra.newDefault') })}
          message={t('confirm.irreversible')}
          confirmLabel={t('menu.delete')}
          cancelLabel={t('common.cancel')}
          danger
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {/* Copia/Sposta una scheda portabile: verso un altro giorno o nella sezione Personalizzate */}
      {schedaMC && (
        <GiornataPickerModal
          title={t(schedaMC.mode === 'copy' ? 'move.copyTitle' : 'move.moveTitle', { name: schedaMC.scheda.nome || t('palestra.newDefault') })}
          giornate={(allGiornate || []).filter(g => g.id !== giornata.id && !g.custom)}
          topLevelLabel={t('move.topLevel')}
          onPick={id => {
            const target = (allGiornate || []).find(g => g.id === id)
            const clash = target && schedaNameTaken(target.schede, schedaMC.scheda.nome)
            const op = schedaMC
            setSchedaMC(null)
            if (clash) setSchedaOverwrite({ scheda: op.scheda, mode: op.mode, targetId: id })
            else if (op.mode === 'copy') onSchedaCopyTo(op.scheda, id)
            else onSchedaMoveTo(op.scheda, id)
          }}
          onPickTopLevel={() => { onSchedaToTopLevel(schedaMC.scheda, schedaMC.mode); setSchedaMC(null) }}
          onCancel={() => setSchedaMC(null)}
        />
      )}

      {/* Conferma sovrascrittura: la destinazione ha già una scheda con lo stesso nome */}
      {schedaOverwrite && (
        <ConfirmModal
          title={t('confirm.overwriteTitle')}
          message={t('confirm.overwriteMsg', { name: schedaOverwrite.scheda.nome || t('palestra.newDefault') })}
          confirmLabel={t('common.yes')}
          cancelLabel={t('common.no')}
          onConfirm={() => {
            if (schedaOverwrite.mode === 'copy') onSchedaCopyTo(schedaOverwrite.scheda, schedaOverwrite.targetId)
            else onSchedaMoveTo(schedaOverwrite.scheda, schedaOverwrite.targetId)
            setSchedaOverwrite(null)
          }}
          onCancel={() => setSchedaOverwrite(null)}
        />
      )}
    </div>
  )
}

export default GiornataView
