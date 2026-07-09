import { FcGoogle } from 'react-icons/fc'

// Provider OAuth supportati. Per aggiungerne di nuovi (Apple, Facebook, GitHub…)
// basta appendere una voce qui: la UI (ProviderButtons) e i servizi li leggono da
// questo elenco, senza altre modifiche. `id` deve combaciare col provider Supabase.
export const authProviders = [
  { id: 'google', label: 'Google', icon: FcGoogle },
  // { id: 'apple', label: 'Apple', icon: FaApple },
  // { id: 'facebook', label: 'Facebook', icon: FaFacebook },
  // { id: 'github', label: 'GitHub', icon: FaGithub },
]
