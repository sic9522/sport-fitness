// Validatori riusabili per i form (login e wizard di registrazione).

export const isNonEmpty = v => String(v ?? '').trim().length > 0
export const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v ?? '').trim())
export const isMinLength = (v, n) => String(v ?? '').length >= n
export const isPhone = v => /^[+]?[\d\s().-]{6,20}$/.test(String(v ?? '').trim())
export const isPostalCode = v => /^\d{5}$/.test(String(v ?? '').trim())
export const isPositiveNumber = v => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0
}
export const isPastDate = v => {
  if (!v) return false
  const d = new Date(v)
  return !Number.isNaN(d.getTime()) && d < new Date()
}
