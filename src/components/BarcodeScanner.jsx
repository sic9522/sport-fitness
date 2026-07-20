import { useEffect, useRef, useState } from 'react'
import { IoClose } from 'react-icons/io5'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'
import { useLang } from '../context/LanguageContext'
import useScrollLock from '../hooks/useScrollLock'

// Solo i formati dei codici a barre dei prodotti (EAN/UPC): più veloce e niente
// falsi positivi con i QR. Sono gli stessi barcode usati come `barcode` in food_items.
const PRODUCT_FORMATS = [
  BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
]

// Scanner del codice a barre a tutto schermo (fotocamera posteriore). Decodifica in
// continuo: al primo codice valido chiama `onScan(code)` una sola volta e si ferma.
// Non fa lookup: chi lo usa (FoodEditor) cerca il prodotto in catalogo col codice.
// `onClose` = chiusura senza scansione (X, Esc o errore fotocamera).
function BarcodeScanner({ onScan, onClose }) {
  const { t } = useLang()
  useScrollLock()
  const videoRef = useRef(null)
  const [error, setError] = useState(false)
  // onScan/onClose possono cambiare identità tra i render: li tengo in ref così l'effetto
  // che avvia la fotocamera parte UNA volta sola (niente riavvii dello stream).
  const onScanRef = useRef(onScan)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onScanRef.current = onScan
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, PRODUCT_FORMATS]])
    const reader = new BrowserMultiFormatReader(hints)
    let controls = null
    let done = false // scansione già consegnata: ignora i frame successivi

    reader
      .decodeFromConstraints({ video: { facingMode: 'environment' } }, videoRef.current, result => {
        if (result && !done) {
          done = true
          controls?.stop()
          onScanRef.current(result.getText())
        }
      })
      .then(c => {
        controls = c
        if (done) controls.stop() // codice letto prima che la promise risolvesse
      })
      .catch(() => setError(true)) // permesso negato o nessuna fotocamera

    return () => controls?.stop()
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <button
        onClick={onClose}
        aria-label={t('common.cancel')}
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white"
      >
        <IoClose className="text-2xl" />
      </button>

      {error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-sm text-white/80">{t('nutrition.scanError')}</p>
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {t('common.cancel')}
          </button>
        </div>
      ) : (
        <>
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          {/* Mirino: banda centrale che guida l'inquadratura del codice. */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-6">
            <div className="h-32 w-4/5 max-w-xs rounded-xl border-2 border-white/80 shadow-[0_0_0_100vmax_rgba(0,0,0,0.45)]" />
            <p className="px-6 text-center text-sm text-white/90">{t('nutrition.scanHint')}</p>
          </div>
        </>
      )}
    </div>
  )
}

export default BarcodeScanner
