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
  const [error, setError] = useState(null) // errore emerso all'avvio della fotocamera

  // getUserMedia esiste SOLO in secure context: su http:// (tipico caso dell'indirizzo IP
  // in rete locale) `navigator.mediaDevices` è proprio assente e il browser non mostra
  // nessuna richiesta di permesso. È la causa più frequente del "permesso negato"
  // apparente, anche quando la fotocamera è autorizzata nelle impostazioni.
  // È una proprietà dell'ambiente, non uno stato: si legge in render.
  const insecure = !window.isSecureContext || !navigator.mediaDevices?.getUserMedia
  const shownError = insecure ? t('nutrition.scanNeedsHttps') : error
  // onScan/onClose possono cambiare identità tra i render: li tengo in ref così l'effetto
  // che avvia la fotocamera parte UNA volta sola (niente riavvii dello stream).
  const onScanRef = useRef(onScan)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onScanRef.current = onScan
    onCloseRef.current = onClose
  })

  useEffect(() => {
    // Contesto non sicuro: non c'è nulla da avviare (vedi `insecure` sopra).
    if (insecure) return undefined

    const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, PRODUCT_FORMATS]])
    const reader = new BrowserMultiFormatReader(hints)
    let controls = null
    let done = false // scansione già consegnata: ignora i frame successivi
    let cancelled = false

    function onResult(result) {
      if (result && !done) {
        done = true
        controls?.stop()
        onScanRef.current(result.getText())
      }
    }

    // Messaggio utile invece di un generico "non disponibile": i nomi degli errori di
    // getUserMedia sono standard e dicono esattamente cosa è andato storto.
    function describe(err) {
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') return t('nutrition.scanDenied')
      if (err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError') return t('nutrition.scanNoCamera')
      return `${t('nutrition.scanError')}${err?.message ? ` (${err.name}: ${err.message})` : ''}`
    }

    ;(async () => {
      // La posteriore è una PREFERENZA, non un obbligo: su desktop non esiste e un
      // vincolo rigido farebbe fallire tutto. Se il primo tentativo non va, si ripiega
      // su una fotocamera qualsiasi.
      const attempts = [
        { video: { facingMode: { ideal: 'environment' } } },
        { video: true },
      ]
      let lastErr = null
      for (const constraints of attempts) {
        try {
          const c = await reader.decodeFromConstraints(constraints, videoRef.current, onResult)
          if (cancelled) { c.stop(); return }
          controls = c
          if (done) c.stop() // codice letto prima che la promise risolvesse
          return
        } catch (err) {
          lastErr = err
          // Permesso negato: insistere con altri vincoli non cambia nulla.
          if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') break
        }
      }
      console.error('Scanner: avvio fotocamera fallito', lastErr)
      if (!cancelled) setError(describe(lastErr))
    })()

    return () => {
      cancelled = true
      controls?.stop()
    }
  }, [t, insecure])

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

      {shownError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-sm text-white/80">{shownError}</p>
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
