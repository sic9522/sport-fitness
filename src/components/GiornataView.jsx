import { useState, useEffect } from 'react'
import { IoAdd, IoEllipsisVertical, IoCreateOutline, IoTrashOutline, IoCopyOutline, IoArrowRedoOutline } from 'react-icons/io5'
import TopBar from './TopBar'
import SchedaView from './SchedaView'
import ConfirmModal from './ConfirmModal'
import PromptModal from './PromptModal'
import GiornataPickerModal from './GiornataPickerModal'
import { useLang } from '../context/LanguageContext'
import { giornataName, newId, schedaNameTaken } from '../data/giornateDefaults'
import { titleCase } from '../utils/text'

// Pagina interna (NON una rotta) di una giornata: elenca le sue schede e apre SchedaView.
function GiornataView({ giornata, allGiornate, onSchedeChange, onBack, onSchedaCopyTo, onSchedaMoveTo, onSchedaToTopLevel }) {
  const { t } = useLang()
  const schede = giornata.schede

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
                className="relative rounded-xl overflow-hidden h-32 bg-gradient-to-r from-gray-900 to-gray-800 cursor-pointer"
              >
                <div className="absolute inset-0 bg-black/40" />
                <div className="relative p-4 flex justify-between items-start h-full">
                  <div className="flex flex-col justify-end h-full">
                    <span className="font-bold text-lg">{scheda.nome || t('palestra.newDefault')}</span>
                    <span className="text-[color:var(--text-muted)] text-xs mt-1 uppercase tracking-wider">
                      {t('palestra.exercises', { count: scheda.esercizi.length })}
                    </span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setMenuId(menuId === scheda.id ? null : scheda.id) }}
                    className="text-[color:var(--text-dim)] p-1 hover:text-[color:var(--text)] transition-colors"
                  >
                    <IoEllipsisVertical />
                  </button>
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
