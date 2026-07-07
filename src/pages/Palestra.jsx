import { useState } from 'react'
import { IoAdd, IoEllipsisVertical, IoBarbell, IoCreateOutline, IoTrashOutline } from 'react-icons/io5'
import TopBar from '../components/TopBar'
import RestPicker from '../components/RestPicker'
import SchedaView from '../components/SchedaView'
import ConfirmModal from '../components/ConfirmModal'
import { useLang } from '../context/LanguageContext'
import { useTimer } from '../context/TimerContext'
import { loadSchede, saveSchede } from '../data/schedeDefaults'

function mmss(total) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function Palestra() {
  const { t } = useLang()
  const { restDuration } = useTimer()

  const [schede, setSchede] = useState(loadSchede)
  const [openId, setOpenId] = useState(null)     // modale dettaglio aperta
  const [menuId, setMenuId] = useState(null)     // menu tre-puntini aperto
  const [deleteId, setDeleteId] = useState(null) // conferma eliminazione

  function commit(next) {
    setSchede(next)
    saveSchede(next)
  }

  function createScheda() {
    const nuova = { id: String(Date.now()), nome: t('palestra.newDefault'), esercizi: [] }
    commit([...schede, nuova])
    setOpenId(nuova.id) // apre subito la pagina scheda per rinominarla
  }
  function renameScheda(id, nome) {
    commit(schede.map(s => (s.id === id ? { ...s, nome } : s)))
  }
  function setEsercizi(id, esercizi) {
    commit(schede.map(s => (s.id === id ? { ...s, esercizi } : s)))
  }
  function confirmDelete() {
    commit(schede.filter(s => s.id !== deleteId))
    if (openId === deleteId) setOpenId(null)
    setDeleteId(null)
  }
  function closeModal() {
    // Nome svuotato durante la modifica → ripristina un nome di default
    if (openId) {
      commit(schede.map(s => (s.id === openId && !s.nome.trim() ? { ...s, nome: t('palestra.newDefault') } : s)))
    }
    setOpenId(null)
  }

  const openScheda = schede.find(s => s.id === openId)
  const deletingScheda = schede.find(s => s.id === deleteId)

  // Dettaglio scheda come PAGINA interna (non una rotta, non una modale)
  if (openScheda) {
    return (
      <SchedaView
        scheda={openScheda}
        restLabel={mmss(restDuration)}
        onRename={renameScheda}
        onExercisesChange={newArr => setEsercizi(openScheda.id, newArr)}
        onBack={closeModal}
      />
    )
  }

  return (
    <div className="flex flex-col pb-24">

      <TopBar icon={IoBarbell} title={t('title.myworkout')} />

      {/* Section Header */}
      <div className="px-5 pt-2 pb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-3xl font-extrabold leading-tight">
            {t('palestra.title')}
          </h2>
          <p className="text-[color:var(--text-muted)] text-sm mt-2">
            {t('palestra.subtitle')}
          </p>
        </div>
        {/* Selettore recupero compatto: scrive il valore condiviso usato da Recupero */}
        <RestPicker />
      </div>

      {/* Schede */}
      <div className="px-5 flex flex-col gap-3">
        {schede.map(scheda => (
          <div key={scheda.id} className="relative">
            <div
              onClick={() => setOpenId(scheda.id)}
              className="relative rounded-xl overflow-hidden h-32 bg-gradient-to-r from-gray-900 to-gray-800 cursor-pointer"
            >
              <div className="absolute inset-0 bg-black/40" />
              <div className="relative p-4 flex justify-between items-start h-full">
                <div className="flex flex-col justify-end h-full">
                  <span className="font-bold text-lg">{scheda.nome}</span>
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

            {/* Menu tre-puntini (fuori dalla card per non essere tagliato) */}
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
        ))}
      </div>

      {/* Crea nuova scheda — in fondo alle schede esistenti */}
      <div className="px-5 mt-3">
        <button
          onClick={createScheda}
          className="w-full rounded-xl py-4 flex items-center justify-center gap-2 font-bold tracking-widest uppercase text-sm"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          <IoAdd className="text-xl" />
          {t('palestra.newCard')}
        </button>
      </div>

      {/* Progress Widget */}
      <div className="px-5 mt-5">
        <div className="bg-[var(--surface)] rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
            {t('palestra.weeklyProgress')}
          </p>
          <div className="h-2 bg-[var(--track)] rounded-full overflow-hidden">
            <div className="h-full rounded-full w-[75%]" style={{ backgroundColor: 'var(--accent)' }} />
          </div>
          <p className="text-[color:var(--text-muted)] text-xs mt-2">
            {t('palestra.completed', { done: 3, total: 4 })}
          </p>
        </div>
      </div>

      {/* Backdrop invisibile: un tap fuori chiude il menu tre-puntini */}
      {menuId && <div className="fixed inset-0 z-20" onClick={() => setMenuId(null)} />}

      {/* Conferma eliminazione scheda */}
      {deletingScheda && (
        <ConfirmModal
          title={t('confirm.deleteScheda', { name: deletingScheda.nome })}
          message={t('confirm.irreversible')}
          confirmLabel={t('menu.delete')}
          cancelLabel={t('common.cancel')}
          danger
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

    </div>
  )
}

export default Palestra
