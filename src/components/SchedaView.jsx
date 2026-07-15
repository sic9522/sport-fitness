import { useState, useRef, useEffect } from 'react'
import { IoAdd, IoStopwatchOutline, IoBarbellOutline, IoClose, IoPencil, IoReorderTwoOutline } from 'react-icons/io5'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import TopBar from './TopBar'
import EsercizioEditor from './EsercizioEditor'
import { useLang } from '../context/LanguageContext'
import useLongPress from '../hooks/useLongPress'
import { titleCase } from '../utils/text'

function newId() {
  return (crypto?.randomUUID && crypto.randomUUID()) || String(Date.now())
}

const SLOP = 8            // px oltre i quali il gesto è uno scroll (annulla pressione e tap)
const TAP_WINDOW = 280    // ms per contare doppio/triplo tap
const LONG_PRESS_MS = 400 // ms di pressione per entrare in modalità modifica (stile iPhone)
const RED = '#ef4444'
const BLUE = '#3b82f6'
const STATO_DONE = '#22c55e' // bordo verde: esercizio svolto (doppio tap)
const STATO_SKIP = '#ef4444' // bordo rosso: esercizio saltato (triplo tap)

// Pulsanti della modalità modifica: cerchietti a cavallo del bordo della card
// (le classi -top-3/-left-3/-right-3 li fanno sporgere ~50% del diametro, come su iPhone).
const EDIT_BTN = 'absolute z-20 w-6 h-6 rounded-full flex items-center justify-center shadow-md'

// Bordo colorato solo se c'è uno stato (verde/rosso); altrimenti bordo neutro sottile.
const resolveBorder = ex =>
  ex.stato === 'done' ? STATO_DONE : ex.stato === 'skip' ? STATO_SKIP : null

// Contenuto visivo della card (riusato da lista e DragOverlay). La maniglia a destra
// è il punto di trascinamento per il riordino (handleProps = ref/listeners di @dnd-kit).
function CardVisual({ ex, borderColor, handleProps, style, className = '' }) {
  const { t } = useLang()
  return (
    <div
      style={{ borderColor: borderColor || undefined, ...style }}
      className={`bg-[var(--surface)] rounded-xl p-3 flex items-center gap-3 select-none ${
        borderColor ? 'border-2' : 'border border-[color:var(--border-1)]'
      } ${className}`}
    >
      <div className="w-14 h-14 rounded-lg bg-[var(--fill-1)] flex items-center justify-center shrink-0 overflow-hidden">
        {ex.foto ? (
          <img src={ex.foto} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <IoBarbellOutline className="text-2xl text-[color:var(--text-dim)]" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm truncate">{ex.titolo}</p>
        <p className="text-[color:var(--text-muted)] text-xs mt-0.5 tabular-nums">
          {ex.serie} {t('esercizio.serie')} · {ex.reps} {t('esercizio.reps')} · {ex.kg} kg
        </p>
      </div>
      <button
        {...(handleProps || {})}
        aria-label={t('esercizio.reorder')}
        className="shrink-0 text-[color:var(--text-dim)] hover:text-[color:var(--text)] cursor-grab active:cursor-grabbing p-1"
      >
        <IoReorderTwoOutline className="text-xl" />
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
function SchedaView({ scheda, restLabel, onRename, onExercisesChange, onBack }) {
  const { t } = useLang()
  const esercizi = scheda.esercizi
  const [editingId, setEditingId] = useState(null)
  const [newDraft, setNewDraft] = useState(null)
  const [activeId, setActiveId] = useState(null) // card trascinata (per il DragOverlay)
  // Modalità modifica (stile iPhone): attiva per TUTTE le card insieme.
  // Stato tenuto qui (proprietario della lista) così è estendibile a future azioni.
  const [editMode, setEditMode] = useState(false)
  const [nameError, setNameError] = useState(false) // nome scheda mancante al click su +
  const nameRef = useRef(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function openNew() {
    // Nome scheda OBBLIGATORIO prima di aggiungere un esercizio: se vuoto non si va
    // avanti (evita che la scheda venga poi auto-nominata "Nuova scheda").
    if (!scheda.nome.trim()) {
      setNameError(true)
      nameRef.current?.focus()
      return
    }
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

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <TopBar onBack={onBack} title={(scheda.nome || '').toUpperCase()} />

      {/* Header: nome modificabile + badge recupero + aggiungi */}
      <div className="px-5 pt-3">
        <div className="flex items-center gap-2">
          <input
            ref={nameRef}
            value={scheda.nome}
            onChange={e => {
              onRename(scheda.id, e.target.value)
              if (nameError && e.target.value.trim()) setNameError(false)
            }}
            onBlur={e => onRename(scheda.id, titleCase(e.target.value.trim()))}
            placeholder={t('palestra.schedaPlaceholder')}
            className={`flex-1 min-w-0 bg-transparent text-2xl font-extrabold outline-none border-b pb-1 placeholder:text-[color:var(--text-faint)] ${
              nameError ? 'border-red-400' : 'border-transparent focus:border-[color:var(--border-3)]'
            }`}
          />
          <span className="flex items-center gap-1 rounded-full bg-[var(--fill-1)] border border-[color:var(--border-2)] px-2.5 py-1 shrink-0">
            <IoStopwatchOutline className="text-sm" style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-semibold tabular-nums">{restLabel}</span>
          </span>
          <button
            onClick={openNew}
            aria-label={t('palestra.addExercise')}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            <IoAdd className="text-xl" />
          </button>
        </div>
        {nameError && <p className="text-xs text-red-400 mt-1">{t('palestra.schedaNameRequired')}</p>}
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
              <div className="flex flex-col gap-3 pb-2">
                {esercizi.map(ex => (
                  <EsercizioCard
                    key={ex.id}
                    ex={ex}
                    editMode={editMode}
                    onEnterEdit={() => setEditMode(true)}
                    onDelete={deleteEsercizio}
                    onEdit={setEditingId}
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
    </div>
  )
}

export default SchedaView
