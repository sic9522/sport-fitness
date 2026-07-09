// Prima lettera di ogni parola in maiuscolo, il resto invariato.
// Es: "pull day" → "Pull Day", "pull Day" → "Pull Day", "PULL DAY" → "PULL DAY".
export const titleCase = str =>
  (str || '').replace(/(^|\s)(\S)/g, (_, sp, ch) => sp + ch.toUpperCase())
