import { useState, useRef } from 'react'
import { IoEllipsisVertical, IoTrashOutline, IoCopyOutline, IoArrowRedoOutline } from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'
import { giornataName } from '../data/giornateDefaults'

const SLOP = 8       // px minimi per distinguere swipe da scroll/tap
const COMMIT = 90    // px reali per confermare lo swipe (imposta lo stato)
const MAXSLIDE = 64  // px massimi di scivolamento visivo della card
const RESIST = 0.4   // resistenza: lo slittamento visivo è più corto del dito
const DONE = '#22c55e' // verde: completato (dito verso sinistra)
const SKIP = '#ef4444' // rosso: saltato (dito verso destra)

// Card di una giornata. Tap → apre. Swipe orizzontale → marca Completato/Saltato
// (toggle): il badge resta visibile in alto a sinistra, senza coprire nome/contatore.
function GiornataCard({ giornata, menuOpen, onToggleMenu, onDelete, onOpen, onToggleStato, onCopy, onMove }) {
  const { t } = useLang()
  const [swipeX, setSwipeX] = useState(0)
  const [swiping, setSwiping] = useState(false)

  const startRef = useRef(null)
  const modeRef = useRef(null)
  const rawRef = useRef(0)

  function reset() {
    setSwipeX(0); setSwiping(false)
    startRef.current = null; modeRef.current = null; rawRef.current = 0
  }

  function swipeDown(e) {
    // Tre-puntini / menu: non è swipe né apertura → lasciali gestire ai loro onClick
    if (e.target.closest('[data-nostatus]')) return
    startRef.current = { x: e.clientX, y: e.clientY }
    modeRef.current = null
    rawRef.current = 0
  }
  function swipeMove(e) {
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
      setSwipeX(s * Math.min(MAXSLIDE, a * RESIST))
    }
  }
  function swipeUp() {
    if (!startRef.current) return
    const wasTap = modeRef.current === null
    if (modeRef.current === 'swipe') {
      if (rawRef.current >= COMMIT) onToggleStato('skip')       // dito verso destra → saltato
      else if (rawRef.current <= -COMMIT) onToggleStato('done')  // dito verso sinistra → completato
    }
    reset()
    if (wasTap) onOpen()
  }

  // Durante lo swipe mostro in anteprima lo stato che sto per impostare; a riposo lo stato salvato.
  const preview = swiping && Math.abs(swipeX) > 10 ? (swipeX > 0 ? 'skip' : 'done') : null
  const shown = preview || giornata.stato || null
  const color = shown === 'done' ? DONE : shown === 'skip' ? SKIP : null
  const label = shown === 'done' ? t('stato.done') : shown === 'skip' ? t('stato.skip') : ''

  return (
    <div className="relative">
      <div
        className="relative rounded-xl overflow-hidden touch-pan-y"
        onPointerDownCapture={swipeDown}
        onPointerMoveCapture={swipeMove}
        onPointerUpCapture={swipeUp}
        onPointerCancelCapture={reset}
      >
        <div
          className="relative h-32 bg-gradient-to-r from-gray-900 to-gray-800 cursor-pointer"
          style={{ transform: `translateX(${swipeX}px)`, transition: swiping ? 'none' : 'transform 0.2s ease' }}
        >
          <div className="absolute inset-0 bg-black/40" />

          {/* Badge stato: in alto a sinistra (zona libera), non copre nome/contatore */}
          {shown && (
            <span
              className="absolute top-3 left-4 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider select-none"
              style={{ color, backgroundColor: `${color}2e`, border: `1px solid ${color}80` }}
            >
              {label}
            </span>
          )}

          <div className="relative p-4 flex justify-between items-start h-full">
            <div className="flex flex-col justify-end h-full">
              <span className="font-bold text-lg">{giornataName(giornata, t)}</span>
              <span className="text-[color:var(--text-muted)] text-xs mt-1 uppercase tracking-wider">
                {t('palestra.schede', { count: giornata.schede.length })}
              </span>
            </div>
            <button
              data-nostatus
              onClick={onToggleMenu}
              className="text-[color:var(--text-dim)] p-1 hover:text-[color:var(--text)] transition-colors"
            >
              <IoEllipsisVertical />
            </button>
          </div>
        </div>
      </div>

      {/* Menu tre-puntini (fuori dalla card per non essere tagliato) */}
      {menuOpen && (
        <div
          data-nostatus
          className="absolute right-2 top-11 z-30 w-44 rounded-xl bg-[var(--surface)] border border-[color:var(--border-2)] shadow-xl overflow-hidden"
        >
          {/* Solo giornate a nome personalizzato: copiabili/spostabili altrove */}
          {giornata.custom && (
            <>
              <button
                onClick={onCopy}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-[var(--surface-3)] transition-colors"
              >
                <IoCopyOutline className="text-base" />
                {t('menu.copyTo')}
              </button>
              <button
                onClick={onMove}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-[var(--surface-3)] transition-colors"
              >
                <IoArrowRedoOutline className="text-base" />
                {t('menu.moveTo')}
              </button>
            </>
          )}
          <button
            onClick={onDelete}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-[var(--surface-3)] transition-colors"
            style={{ color: '#ef4444' }}
          >
            <IoTrashOutline className="text-base" />
            {t('menu.delete')}
          </button>
        </div>
      )}
    </div>
  )
}

export default GiornataCard
