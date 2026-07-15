import { useState, useRef, useEffect } from 'react'
import { IoAdd, IoPlay, IoBarbellOutline, IoClose, IoPencil, IoReorderTwoOutline } from 'react-icons/io5'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import TopBar from './TopBar'
import EsercizioEditor from './EsercizioEditor'
import ConfirmModal from './ConfirmModal'
import RestPicker from './RestPicker'
import { useLang } from '../context/LanguageContext'
import useLongPress from '../hooks/useLongPress'
import { editorRows, formatKg } from '../data/exerciseSets'

function newId() {
  return (crypto?.randomUUID && crypto.randomUUID()) || String(Date.now())
}

const SLOP = 8            // px oltre i quali il gesto è uno scroll (annulla pressione e tap)
const TAP_WINDOW = 280    // ms per contare doppio/triplo tap
const LONG_PRESS_MS = 400 // ms di pressione per entrare in modalità modifica (stile iPhone)
const RED = '#ef4444'
const BLUE = '#3b82f6'  // primary (pulsante Modifica in modalità modifica)
const GREEN = '#22c55e' // success (pulsante Play)
const STATO_DONE = '#22c55e' // bordo verde: esercizio svolto (doppio tap)
const STATO_SKIP = '#ef4444' // bordo rosso: esercizio saltato (triplo tap)

// Pulsanti della modalità modifica: cerchietti a cavallo del bordo della card
// (le classi -top-3/-left-3/-right-3 li fanno sporgere ~50% del diametro, come su iPhone).
const EDIT_BTN = 'absolute z-20 w-6 h-6 rounded-full flex items-center justify-center shadow-md'

// Elementi dell'header della scheda: stessa altezza per un allineamento perfetto
// (la larghezza la decide ognuno: Play e recupero uguali, "+" resta come prima).
const HEADER_BTN = 'h-9 rounded-full flex items-center justify-center shrink-0'

// Bordo colorato solo se c'è uno stato (verde/rosso); altrimenti bordo neutro sottile.
const resolveBorder = ex =>
  ex.stato === 'done' ? STATO_DONE : ex.stato === 'skip' ? STATO_SKIP : null

const INFO_CLS = 'text-[color:var(--text-muted)] text-xs tabular-nums'

// Split OFF: numero di serie e, sotto, "Rip 8 - 30 kg" nello stesso formato delle
// righe dello split.
function ExerciseInfoLine({ ex }) {
  const { t } = useLang()
  return (
    <div className="flex flex-col gap-0.5">
      <p className={INFO_CLS}>{t('esercizio.serie')} {ex.serie}</p>
      <p className={INFO_CLS}>
        <span>{t('esercizio.reps')} {ex.reps}</span> - <span>{formatKg(ex.kg)} kg</span>
      </p>
    </div>
  )
}

// Split ON: una riga per serie con SOLO rip e peso (il numero di righe È già il numero
// di serie), nel formato "<span>Rip 8</span> - <span>30 kg</span>". Le righe vengono da
// editorRows(), quindi restano sincronizzate col valore della select senza duplicare la
// logica dello split.
function ExerciseSetRows({ ex }) {
  const { t } = useLang()
  return (
    <div className="flex flex-col gap-0.5">
      {editorRows(ex).map((r, i) => (
        <p key={i} className={INFO_CLS}>
          <span>{t('esercizio.reps')} {r.reps}</span> - <span>{formatKg(r.kg)} kg</span>
        </p>
      ))}
    </div>
  )
}

// Contenuto visivo della card (riusato da lista e DragOverlay). La maniglia a destra
// è il punto di trascinamento per il riordino (handleProps = ref/listeners di @dnd-kit).
function CardVisual({ ex, borderColor, handleProps, style, className = '' }) {
  const { t } = useLang()
  return (
    <div
      style={{ borderColor: borderColor || undefined, ...style }}
      className={`h-[120px] bg-[var(--surface)] rounded-xl p-2 flex items-center gap-3 select-none ${
        borderColor ? 'border-2' : 'border border-[color:var(--border-1)]'
      } ${className}`}
    >
      <div className="w-[74px] h-[74px] rounded-lg bg-[var(--fill-1)] flex items-center justify-center shrink-0 overflow-hidden">
        {ex.foto ? (
          <img src={ex.foto} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <IoBarbellOutline className="text-2xl text-[color:var(--text-dim)]" />
        )}
      </div>
      {/* Area centrale (fra immagine e maniglia): stessi due contenitori con Split ON e OFF
          (titolo ~45% / dati ~55%). Cambia SOLO il contenuto del secondo contenitore.
          `self-stretch` porta la colonna all'altezza della card. */}
      <div className="min-w-0 flex-1 self-stretch flex items-center gap-2">
        {/* Contenitore 1 (~45%): titolo, va a capo e riempie tutta la larghezza */}
        <div className="min-w-0 basis-[45%] flex flex-col justify-center">
          <p className="font-semibold text-sm break-words">{ex.titolo}</p>
        </div>
        {/* Contenitore 2 (~55%): dati esercizio, centrati verticalmente */}
        <div className="min-w-0 basis-[55%] flex flex-col justify-center">
          {ex.split ? <ExerciseSetRows ex={ex} /> : <ExerciseInfoLine ex={ex} />}
        </div>
      </div>
      <button
        {...(handleProps || {})}
        aria-label={t('esercizio.reorder')}
        className="shrink-0 text-[color:var(--text-dim)] hover:text-[color:var(--text)] cursor-grab active:cursor-grabbing p-1"
      >
        <IoReorderTwoOutline className="text-[30px]" />
      </button>
    </div>
  )
}

// Card esercizio (una per riga).
// - Pressione prolungata (~400ms) → attiva la MODALITÀ MODIFICA (su tutte le card).
//   In modalità modifica la card trema e mostra i pulsanti elimina (X, alto sx) e
//   modifica (matita, alto dx), che richiamano le STESSE funzioni di prima.
// - Doppio tap → verde (svolto); triplo tap → rosso (skip); ripetendo torna normale.
// - Riordino: trascinando la MANIGLIA a destra (DragOverlay + segnaposto).
function EsercizioCard({ ex, editMode, onEnterEdit, onDelete, onEdit, onToggleStato }) {
  const { t } = useLang()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: ex.id })

  const longPress = useLongPress(onEnterEdit, LONG_PRESS_MS)
  const startRef = useRef(null)
  const movedRef = useRef(false) // puntatore mosso → è uno scroll: né pressione né tap
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef(null)
  useEffect(() => () => clearTimeout(tapTimerRef.current), [])

  function onPointerDown(e) {
    // Maniglia (riordino) e pulsanti modifica gestiscono il proprio gesto.
    if (e.target.closest('[data-handle], [data-edit-btn]')) return
    startRef.current = { x: e.clientX, y: e.clientY }
    movedRef.current = false
    longPress.start()
  }
  function onPointerMove(e) {
    if (!startRef.current || movedRef.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) > SLOP) {
      movedRef.current = true
      longPress.cancel()
    }
  }
  function onPointerUp() {
    if (!startRef.current) return // nessun tracking (maniglia o pulsante)
    const wasLongPress = longPress.fired.current
    const moved = movedRef.current
    startRef.current = null
    longPress.cancel()
    if (wasLongPress || moved) return // pressione prolungata o scroll → non è un tap

    tapCountRef.current += 1
    clearTimeout(tapTimerRef.current)
    tapTimerRef.current = setTimeout(() => {
      const n = tapCountRef.current
      tapCountRef.current = 0
      if (n >= 3) onToggleStato(ex.id, 'skip')       // triplo tap = skip (rosso)
      else if (n === 2) onToggleStato(ex.id, 'done')  // doppio tap = svolto (verde)
    }, TAP_WINDOW)
  }
  function onPointerCancel() {
    startRef.current = null
    longPress.cancel()
  }

  const wrapStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  }

  const handleProps = {
    ref: setActivatorNodeRef,
    ...attributes,
    ...listeners,
    'data-handle': '',
    style: { touchAction: 'none' },
  }

  return (
    <div
      ref={setNodeRef}
      style={wrapStyle}
      data-ex-card=""
      className="relative rounded-xl"
      onPointerDownCapture={onPointerDown}
      onPointerMoveCapture={onPointerMove}
      onPointerUpCapture={onPointerUp}
      onPointerCancelCapture={onPointerCancel}
    >
      {/* Card (trema in modalità modifica; segnaposto sbiadito mentre la trascini) */}
      <CardVisual
        ex={ex}
        borderColor={resolveBorder(ex)}
        handleProps={handleProps}
        className={`${editMode ? 'jiggle' : ''} ${isDragging ? 'opacity-40' : ''}`}
      />

      {/* Pulsanti modalità modifica: stesse azioni di prima (elimina / modifica) */}
      {editMode && (
        <>
          <button
            data-edit-btn=""
            onClick={() => onDelete(ex.id)}
            aria-label={t('menu.delete')}
            className={`${EDIT_BTN} -top-3 -left-3`}
            style={{ backgroundColor: RED }}
          >
            <IoClose className="text-base text-white" />
          </button>
          <button
            data-edit-btn=""
            onClick={() => onEdit(ex.id)}
            aria-label={t('menu.edit')}
            className={`${EDIT_BTN} -top-3 -right-3`}
            style={{ backgroundColor: BLUE }}
          >
            <IoPencil className="text-xs text-white" />
          </button>
        </>
      )}
    </div>
  )
}

// Pagina interna (NON una rotta) del dettaglio scheda.
function SchedaView({ scheda, onExercisesChange, onRestChange, onBack }) {
  const { t } = useLang()
  const esercizi = scheda.esercizi
  const [editingId, setEditingId] = useState(null)
  const [newDraft, setNewDraft] = useState(null)
  const [activeId, setActiveId] = useState(null) // card trascinata (per il DragOverlay)
  // Modalità modifica (stile iPhone): attiva per TUTTE le card insieme.
  // Stato tenuto qui (proprietario della lista) così è estendibile a future azioni.
  const [editMode, setEditMode] = useState(false)
  const [deleteExId, setDeleteExId] = useState(null) // esercizio in attesa di conferma eliminazione

  // Uscita dalla modalità modifica: tocco FUORI dalle card. Disattivata mentre la
  // conferma di eliminazione è aperta (confermare o annullare non fa uscire).
  useEffect(() => {
    if (!editMode || deleteExId) return undefined
    function onDocDown(e) {
      if (!e.target.closest('[data-ex-card]')) setEditMode(false)
    }
    document.addEventListener('pointerdown', onDocDown)
    return () => document.removeEventListener('pointerdown', onDocDown)
  }, [editMode, deleteExId])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function openNew() {
    // Nome esercizio vuoto (placeholder nell'editor); serie/rip/kg con valori di default
    setNewDraft({ id: newId(), titolo: '', serie: '3', reps: '8', kg: '20', split: false, foto: null })
  }
  function saveEsercizio(ex) {
    onExercisesChange(
      esercizi.some(e => e.id === ex.id)
        ? esercizi.map(e => (e.id === ex.id ? ex : e))
        : [...esercizi, ex],
    )
  }
  function deleteEsercizio(id) {
    onExercisesChange(esercizi.filter(e => e.id !== id))
    if (editingId === id) setEditingId(null)
  }
  // Pulsante modifica: apre l'editor ED esce dalla modalità modifica.
  function openEsercizio(id) {
    setEditingId(id)
    setEditMode(false)
  }
  // Doppio/triplo tap: attiva o disattiva lo stato "svolto"/"skip"
  function toggleStato(id, target) {
    onExercisesChange(esercizi.map(e => (e.id === id ? { ...e, stato: e.stato === target ? undefined : target } : e)))
  }
  function handleDragEnd(event) {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = esercizi.findIndex(e => e.id === active.id)
    const newIndex = esercizi.findIndex(e => e.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onExercisesChange(arrayMove(esercizi, oldIndex, newIndex))
  }

  const editingEsercizio = esercizi.find(e => e.id === editingId)
  const editorProps = newDraft
    ? { esercizio: newDraft, onSave: ex => { saveEsercizio(ex); setNewDraft(null) }, onCancel: () => setNewDraft(null) }
    : editingEsercizio
      ? { esercizio: editingEsercizio, onSave: ex => { saveEsercizio(ex); setEditingId(null) }, onCancel: () => setEditingId(null) }
      : null

  const activeEx = esercizi.find(e => e.id === activeId)
  const deletingEx = esercizi.find(e => e.id === deleteExId)

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <TopBar onBack={onBack} title={(scheda.nome || '').toUpperCase()} />

      {/* Header: titolo (sola lettura) + Play + recupero della scheda + aggiungi.
          `justify-between` distribuisce lo spazio libero in parti uguali fra i quattro
          elementi; il titolo occupa solo lo spazio del proprio contenuto. */}
      <div className="px-5 pt-3 flex items-center justify-between gap-2">
        {/* Il nome si sceglie alla creazione della scheda: qui è in sola lettura */}
        <h2 className="min-w-0 truncate text-2xl font-extrabold">{scheda.nome}</h2>

        {/* Play (success): per ora SOLO grafica, nessuna azione */}
        <button
          type="button"
          aria-label={t('palestra.play')}
          className={`${HEADER_BTN} w-20`}
          style={{ backgroundColor: GREEN, color: '#fff' }}
        >
          <IoPlay className="text-lg" />
        </button>

        {/* Recupero della SCHEDA: indipendente per ogni scheda (fallback al globale
            finché non viene impostato). Stessa altezza e larghezza del Play. */}
        <RestPicker
          value={scheda.rest}
          onChange={onRestChange}
          className={`${HEADER_BTN} w-20 gap-1 bg-[var(--fill-1)] border border-[color:var(--border-2)] hover:bg-[var(--surface-3)] transition-colors`}
        />

        <button
          onClick={openNew}
          aria-label={t('palestra.addExercise')}
          className={`${HEADER_BTN} w-9`}
          style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          <IoAdd className="text-xl" />
        </button>
      </div>

      {/* Lista esercizi (1 per riga) */}
      <div className="px-5 mt-5 flex-1">
        {esercizi.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-[color:var(--text-dim)] text-sm">{t('palestra.noExercises')}</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={e => setActiveId(e.active.id)}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
          >
            <SortableContext items={esercizi.map(e => e.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-[18px] pb-2">
                {esercizi.map(ex => (
                  <EsercizioCard
                    key={ex.id}
                    ex={ex}
                    editMode={editMode}
                    onEnterEdit={() => setEditMode(true)}
                    onDelete={setDeleteExId}
                    onEdit={openEsercizio}
                    onToggleStato={toggleStato}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeEx
                ? <CardVisual ex={activeEx} borderColor={resolveBorder(activeEx)} className="shadow-2xl scale-[1.03]" />
                : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {editorProps && <EsercizioEditor key={editorProps.esercizio.id} {...editorProps} />}

      {/* Conferma eliminazione: sia Elimina che Annulla NON escono dalla modalità modifica */}
      {deletingEx && (
        <ConfirmModal
          title={t('confirm.deleteEsercizio', { name: deletingEx.titolo })}
          message={t('confirm.irreversible')}
          confirmLabel={t('menu.delete')}
          cancelLabel={t('common.cancel')}
          danger
          onConfirm={() => { deleteEsercizio(deletingEx.id); setDeleteExId(null) }}
          onCancel={() => setDeleteExId(null)}
        />
      )}
    </div>
  )
}

export default SchedaView
