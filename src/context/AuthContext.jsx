import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { flushPendingProfile } from '../services/profile'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) {
      return undefined
    }

    let alive = true

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setSession(data.session)
      setLoading(false)
      if (data.session?.user) flushPendingProfile(data.session.user)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
      // Dopo login/registrazione (anche via redirect OAuth) scrive i dati del wizard.
      if (nextSession?.user) flushPendingProfile(nextSession.user)
    })

    return () => {
      alive = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(() => ({
    isConfigured: isSupabaseConfigured,
    loading,
    session,
    user: session?.user || null,
  }), [loading, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
