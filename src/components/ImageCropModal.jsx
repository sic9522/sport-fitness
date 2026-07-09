import { useState, useRef, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { IoClose } from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'
import useScrollLock from '../hooks/useScrollLock'
import { EXERCISE_IMAGE_ASPECT, getCroppedImageDataUrl } from '../utils/image'

const MIN_FRAC = 0.5 // larghezza minima del riquadro = 50% della massima
const MAX_ZOOM = 4

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

// Schermata di ritaglio in stile app foto native. Si apre subito dopo la
// selezione della foto (galleria/fotocamera): la foto e' gia' pronta da
// regolare. L'utente sposta e fa pinch-to-zoom; l'immagine copre sempre il
// riquadro (nessuna area vuota durante il crop). Il riquadro e' ridimensionabile
// in larghezza dal 100% al 50% tramite le maniglie laterali. Le barre bianche
// non compaiono qui: vengono aggiunte solo nel rendering finale (getCroppedImageDataUrl)
// se il riquadro e' piu' stretto dell'area.
function ImageCropModal({ src, onConfirm, onCancel }) {
  const { t } = useLang()
  useScrollLock()
  const areaRef = useRef(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [boxFrac, setBoxFrac] = useState(1) // larghezza riquadro / larghezza area
  const [areaPixels, setAreaPixels] = useState(null)
  const [busy, setBusy] = useState(false)

  const onCropComplete = useCallback((_, pixels) => setAreaPixels(pixels), [])

  // Trascinamento delle maniglie: la larghezza del riquadro dipende dalla
  // distanza del dito/puntatore dal centro (riquadro sempre centrato).
  function startResize(e) {
    e.preventDefault()
    e.stopPropagation()
    const rect = areaRef.current?.getBoundingClientRect()
    if (!rect) return
    const centerX = rect.left + rect.width / 2

    const onMove = ev => {
      const x = ev.touches ? ev.touches[0].clientX : ev.clientX
      const frac = (Math.abs(x - centerX) / (rect.width / 2))
      setBoxFrac(clamp(frac, MIN_FRAC, 1))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  async function confirm() {
    if (!areaPixels || busy) return
    setBusy(true)
    try {
      onConfirm(await getCroppedImageDataUrl(src, areaPixels))
    } catch {
      setBusy(false) // in caso di errore resta sulla schermata di crop
    }
  }

  // Percentuali dei bordi del riquadro (centrato): a 100% coincidono con l'area.
  const edgeLeft = 50 - boxFrac * 50
  const edgeRight = 50 + boxFrac * 50

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90 backdrop-blur-sm" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button onClick={onCancel} aria-label={t('common.cancel')} className="p-1">
          <IoClose className="text-2xl" />
        </button>
        <span className="font-semibold">{t('esercizio.cropTitle')}</span>
        <span className="w-8" />
      </div>

      {/* Area di editing: forma dell'immagine finale (43:16). Il riquadro attivo
          e' centrato e la sua larghezza segue boxFrac; l'immagine lo copre sempre. */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div ref={areaRef} className="relative w-full aspect-[43/16] overflow-hidden rounded-lg">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            minZoom={1}
            maxZoom={MAX_ZOOM}
            aspect={EXERCISE_IMAGE_ASPECT * boxFrac}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid={false}
          />

          {/* Maniglie di ridimensionamento del riquadro (sinistra/destra) */}
          <Handle side="left" leftPct={edgeLeft} onPointerDown={startResize} />
          <Handle side="right" leftPct={edgeRight} onPointerDown={startResize} />
        </div>
      </div>

      <div className="p-4">
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl py-3 font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#ef4444' }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={confirm}
            disabled={!areaPixels || busy}
            className="flex-1 rounded-xl py-3 font-semibold text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            style={{ backgroundColor: '#3b82f6' }}
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

// Maniglia verticale posizionata sul bordo del riquadro. touch-none per non far
// partire lo scroll/pan durante il trascinamento.
function Handle({ leftPct, onPointerDown }) {
  return (
    <div
      onPointerDown={onPointerDown}
      className="absolute top-0 bottom-0 z-10 flex items-center justify-center touch-none cursor-ew-resize"
      style={{ left: `${leftPct}%`, transform: 'translateX(-50%)', width: 28 }}
    >
      <span className="h-10 w-1.5 rounded-full bg-white/90 shadow" />
    </div>
  )
}

export default ImageCropModal
