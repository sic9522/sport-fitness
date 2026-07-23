// Ripulitura dei campi numerici dei form (kcal, macro, grammi).
//
// Sulle tastiere italiane il tasto decimale è la VIRGOLA, ma `Number('1,5')` è
// NaN: se non si converte, l'utente scrive 1,5 e si ritrova un valore vuoto o un
// totale sbagliato senza capire perché. Qui la virgola diventa punto subito,
// mentre si digita, così quello che si vede è già quello che verrà salvato.

// Solo cifre: per i valori interi (kcal).
export const onlyDigits = v => String(v ?? '').replace(/\D/g, '')

// Cifre + un solo separatore decimale, la virgola convertita in punto.
// I separatori in più vengono ignorati ("1,5,3" → "1.53"), così incollare un
// testo sporco non lascia un valore che Number() non sa leggere.
export function decimalInput(v) {
  const cleaned = String(v ?? '').replace(',', '.').replace(/[^\d.]/g, '')
  const [first, ...rest] = cleaned.split('.')
  return rest.length ? `${first}.${rest.join('')}` : first
}
