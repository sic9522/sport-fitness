import { useState, useRef, useEffect } from 'react'
import { IoAdd, IoStopwatchOutline, IoBarbellOutline, IoTrashOutline, IoCreateOutline, IoReorderTwoOutline } from 'react-icons/io5'
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
import { titleCase } from '../utils/text'

function newId() {
  return (crypto?.randomUUID && crypto.randomUUID()) || String(Date.now())
}

const SLOP = 8         // px minimi per distinguere il gesto (swipe vs scroll)
const DETENT = 44      // px: qui lo swipe "si ferma" e mostra SOLO l'icona
const RESIST = 0.5     // resistenza oltre il detent (fa "frenare" la card)
const TAP_WINDOW = 280 // ms per contare doppio/triplo tap
const RED = '#ef4444'
const BLUE = '#3b82f6'
const STATO_DONE = '#22c55e' // bordo verde: esercizio svolto (doppio tap)
const STATO_SKIP = '#ef4444' // bordo rosso: esercizio saltato (triplo tap)
const confirmPx = w => Math.max(150, w * 0.45)

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
// - Swipe orizzontale a 2 stadi: elimina (destra) / modifica (sinistra).
// - Doppio tap → verde (svolto); triplo tap → rosso (skip); ripetendo torna normale.
// - Riordino: trascinando la MANIGLIA a destra (DragOverlay + segnaposto).
function EsercizioCard({ ex, onDelete, onEdit, onToggleStato }) {
  const { t } = useLang()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: ex.id })

  const [swipeX, setSwipeX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [confirmReady, setConfirmReady] = useState(false)

  const startRef = useRef(null)
  const modeRef = useRef(null)
  const rawRef = useRef(0)
  const widthRef = useRef(0)
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef(null)
  useEffect(() => () => clearTimeout(tapTimerRef.current), [])

  function resetSwipe() {
    setSwipeX(0); setSwiping(false); setRevealed(false); setConfirmReady(false)
    startRef.current = null; modeRef.current = null; rawRef.current = 0
  }

  function onSwipeDown(e) {
    if (e.target.closest('[data-handle]')) return // sulla maniglia → riordino, non swipe
    startRef.current = { x: e.clientX, y: e.clientY }
    modeRef.current = null
    rawRef.current = 0
    widthRef.current = e.currentTarget?.offsetWidth || 320
  }
  function onSwipeMove(e) {
    if (!startRef.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    if (modeRef.current === null && Math.max(Math.abs(dx), Math.abs(dy)) > SLOP) {
      if (Math.abs(dx) > Math.abs(dy)) {
        modeRef.current = 'swipe'
        setSwiping(true)
        e.currentTarget.setPointerCapture?.(e.pointerId)
      } else {
        modeRef.current = 'scroll'
      }
    }
    if (modeRef.current === 'swipe') {
      rawRef.current = dx
      const a = Math.abs(dx), s = Math.sign(dx)
      setSwipeX(a <= DETENT ? dx : s * (DETENT + (a - DETENT) * RESIST))
      const past = a >= DETENT
      const ready = a >= confirmPx(widthRef.current)
      setRevealed(prev => {
        if (past && !prev && navigator.vibrate) navigator.vibrate(6)
        return past
      })
      setConfirmReady(prev => {
        if (ready && !prev && navigator.vibrate) navigator.vibrate(12)
        return ready
      })
    }
  }
  function onSwipeUp() {
    if (!startRef.current) return // era sulla maniglia o nessun tracking
    const wasTap = modeRef.current === null
    if (modeRef.current === 'swipe') {
      const confirm = confirmPx(widthRef.current)
      if (rawRef.current >= confirm) onDelete(ex.id)
      else if (rawRef.current <= -confirm) onEdit(ex.id)
    }
    if (wasTap) {
      tapCountRef.current += 1
      clearTimeout(tapTimerRef.current)
      tapTimerRef.current = setTimeout(() => {
        const n = tapCountRef.current
        tapCountRef.current = 0
        if (n >= 3) onToggleStato(ex.id, 'skip')       // triplo tap = skip (rosso)
        else if (n === 2) onToggleStato(ex.id, 'done')  // doppio tap = svolto (verde)
      }, TAP_WINDOW)
    }
    resetSwipe()
  }
  function onSwipeCancel() {
    resetSwipe()
  }

  const base = CSS.Transform.toString(transform)
  const wrapStyle = {
    transform: base,
    transition,
    touchAction: 'pan-y',
    zIndex: isDragging ? 20 : undefined,
  }

  const handleProps = {
    ref: setActivatorNodeRef,
    ...attributes,
    ...listeners,
    'data-handle': '',
    style: { touchAction: 'none' },
  }

  const showRed = swipeX > 0
  const actionColor = showRed ? RED : BLUE

  return (
    <div
      ref={setNodeRef}
      style={wrapStyle}
      className="relative rounded-xl overflow-hidden"
      onPointerDownCapture={onSwipeDown}
      onPointerMoveCapture={onSwipeMove}
      onPointerUpCapture={onSwipeUp}
      onPointerCancelCapture={onSwipeCancel}
    >
      {/* Sfondo azione rivelato dallo swipe (icona subito, parola solo in conferma) */}
      {swipeX !== 0 && (
        <div
          className="absolute inset-0 flex items-center px-5"
          style={{ backgroundColor: actionColor, justifyContent: showRed ? 'flex-start' : 'flex-end' }}
        >
          <span className="flex items-center gap-2 text-white font-semibold text-sm">
            {showRed ? (
              <>
                {revealed && <IoTrashOutline className="text-lg" />}
                {confirmReady && <span>{t('menu.delete')}</span>}
              </>
            ) : (
              <>
                {confirmReady && <span>{t('menu.edit')}</span>}
                {revealed && <IoCreateOutline className="text-lg" />}
              </>
            )}
          </span>
        </div>
      )}

      {/* Card in primo piano (segnaposto sbiadito mentre la trascini) */}
      <CardVisual
        ex={ex}
        borderColor={resolveBorder(ex)}
        handleProps={handleProps}
        style={{ transform: `translateX(${swipeX}px)`, transition: swiping ? 'none' : 'transform 0.2s ease' }}
        className={`relative ${isDragging ? 'opacity-40' : ''}`}
      />
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function openNew() {
    // Nome vuoto (placeholder nell'editor); serie/rip/kg con valori di default
    setNewDraft({ id: newId(), titolo: '', serie: '3', reps: '8', kg: '20', foto: null })
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
      <div className="px-5 pt-3 flex items-center gap-2">
        <input
          value={scheda.nome}
          onChange={e => onRename(scheda.id, e.target.value)}
          onBlur={e => onRename(scheda.id, titleCase(e.target.value.trim()))}
          placeholder={t('palestra.schedaPlaceholder')}
          className="flex-1 min-w-0 bg-transparent text-2xl font-extrabold outline-none border-b border-transparent focus:border-[color:var(--border-3)] pb-1 placeholder:text-[color:var(--text-faint)]"
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
