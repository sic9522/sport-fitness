import { useRef, useState } from 'react'
import { IoImagesOutline, IoCameraOutline, IoBarbellOutline } from 'react-icons/io5'
import { useLang } from '../context/LanguageContext'
import { readFileAsDataUrl } from '../utils/image'
import ImageCropModal from './ImageCropModal'

// Anteprima dell'immagine di un esercizio con azione "Cambia immagine"
// (galleria o fotocamera). Logica unica, indipendente da come l'esercizio e'
// stato creato: riceve `foto` (URL, data URL o null → placeholder) e notifica
// la nuova immagine via onChange(dataUrl). Tra selezione e salvataggio c'e' lo
// step di ritaglio (ImageCropModal), condiviso da galleria e fotocamera.
function ExerciseImageField({ foto, alt, onChange }) {
  const { t } = useLang()
  const galleryRef = useRef(null)
  const cameraRef = useRef(null)
  const [pendingSrc, setPendingSrc] = useState(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // consenti di riselezionare lo stesso file
    if (!file) return
    try {
      setPendingSrc(await readFileAsDataUrl(file)) // apre il crop, non salva ancora
    } catch {
      // lettura fallita: nessuna modifica
    }
  }

  const btn =
    'w-9 h-9 rounded-full flex items-center justify-center bg-black/55 text-white ' +
    'backdrop-blur-sm hover:bg-black/70 transition-colors'

  return (
    <>
      <div className="relative w-full aspect-[43/16] rounded-xl overflow-hidden bg-[var(--fill-1)] flex items-center justify-center">
        {foto ? (
          <img src={foto} alt={alt || ''} className="w-full h-full object-cover" />
        ) : (
          <IoBarbellOutline className="text-4xl text-[color:var(--text-dim)]" />
        )}

        {/* Azioni sovrapposte in basso a destra */}
        <div className="absolute bottom-2 right-2 flex gap-2">
          <button
            type="button"
            className={btn}
            onClick={() => galleryRef.current?.click()}
            aria-label={t('esercizio.gallery')}
            title={t('esercizio.gallery')}
          >
            <IoImagesOutline className="text-lg" />
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => cameraRef.current?.click()}
            aria-label={t('esercizio.camera')}
            title={t('esercizio.camera')}
          >
            <IoCameraOutline className="text-lg" />
          </button>
        </div>

        {/* Input nascosti: galleria (nessun capture) e fotocamera (capture) */}
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      </div>

      {pendingSrc && (
        <ImageCropModal
          src={pendingSrc}
          onConfirm={url => { onChange(url); setPendingSrc(null) }}
          onCancel={() => setPendingSrc(null)}
        />
      )}
    </>
  )
}

export default ExerciseImageField
