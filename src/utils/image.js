// Logica unica per le immagini degli esercizi (usata sia dagli esercizi presi
// dal database sia da quelli inseriti a mano).

// Dimensioni dell'immagine finale = area prevista dal componente esercizio.
// Aspetto 43:16 (≈ il box h-32 a larghezza piena dell'editor).
export const EXERCISE_IMAGE_WIDTH = 688
export const EXERCISE_IMAGE_HEIGHT = 256
export const EXERCISE_IMAGE_ASPECT = EXERCISE_IMAGE_WIDTH / EXERCISE_IMAGE_HEIGHT

// Legge un File immagine (galleria o fotocamera) e ritorna una data URL.
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// Disegna il ritaglio scelto dall'utente dentro l'area dell'esercizio.
// `croppedAreaPixels` (da react-easy-crop) e' la porzione di sorgente scelta;
// durante il crop l'immagine copre sempre il riquadro (nessun bianco). Qui il
// ritaglio riempie l'ALTEZZA dell'area e la larghezza resta proporzionale,
// centrata: se il riquadro era piu' stretto dell'area restano le barre bianche
// ai lati. Nessun upscale forzato per riempire la larghezza.
export async function getCroppedImageDataUrl(src, croppedAreaPixels, { quality = 0.85 } = {}) {
  const image = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = EXERCISE_IMAGE_WIDTH
  canvas.height = EXERCISE_IMAGE_HEIGHT

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, EXERCISE_IMAGE_WIDTH, EXERCISE_IMAGE_HEIGHT)

  const cropAspect = croppedAreaPixels.width / croppedAreaPixels.height
  const drawHeight = EXERCISE_IMAGE_HEIGHT
  const drawWidth = Math.min(EXERCISE_IMAGE_WIDTH, Math.round(drawHeight * cropAspect))
  const dx = Math.round((EXERCISE_IMAGE_WIDTH - drawWidth) / 2)

  ctx.drawImage(
    image,
    croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height,
    dx, 0, drawWidth, drawHeight,
  )
  return canvas.toDataURL('image/jpeg', quality)
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
