import { FcGoogle } from 'react-icons/fc'
// import { FaGithub } from 'react-icons/fa'
// import { IoCallOutline } from 'react-icons/io5'

// Metodi di accesso alternativi a email/password. Per aggiungerne di nuovi
// (Apple, Facebook…) basta appendere una voce qui: la UI (ProviderButtons) e i
// servizi li leggono da questo elenco. `id` deve combaciare col provider Supabase.
// `kind`: 'oauth' = redirect al provider, 'otp' = codice via SMS (Twilio).
// `labelToken` traduce l'etichetta (i marchi restano invariati, "numero" no).
// Numero e GitHub sono NASCOSTI di proposito (2026-07-23): il codice c'e' e
// funziona, ma i provider non sono ancora configurati lato Supabase (Twilio /
// OAuth App GitHub). Riattivarli = togliere il commento, nient'altro.
export const authProviders = [
  // { id: 'phone', label: 'Numero', labelToken: 'auth.phoneProvider', icon: IoCallOutline, kind: 'otp' },
  { id: 'google', label: 'Google', icon: FcGoogle, kind: 'oauth' },
  // { id: 'github', label: 'GitHub', icon: FaGithub, kind: 'oauth' },
  // { id: 'apple', label: 'Apple', icon: FaApple, kind: 'oauth' },
  // { id: 'facebook', label: 'Facebook', icon: FaFacebook, kind: 'oauth' },
]

// I chiamanti devono distinguere il flusso: l'OTP resta nell'app, l'OAuth redirige.
export const isOtpProvider = id => authProviders.find(p => p.id === id)?.kind === 'otp'
