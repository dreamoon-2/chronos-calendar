import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../services/supabaseClient'
import { DEMO_USER_ID } from '../../services/demoBackend'

export interface AuthUser {
  id: string
  email: string | null
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  /** 是否为演示模式（未配置 Supabase 凭证）。 */
  isDemo: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function toAuthUser(u: User | null): AuthUser | null {
  if (!u) return null
  return { id: u.id, email: u.email ?? null }
}

const isDemoMode = !supabase

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() =>
    isDemoMode ? { id: DEMO_USER_ID, email: 'demo@chronos.local' } : null,
  )
  const [loading, setLoading] = useState<boolean>(!isDemoMode)

  useEffect(() => {
    const client = supabase
    if (!client) return

    let active = true
    client.auth.getSession().then(({ data }) => {
      if (!active) return
      setUser(toAuthUser(data.session?.user ?? null))
      setLoading(false)
    })

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      setUser(toAuthUser(session?.user ?? null))
      setLoading(false)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, isDemo: isDemoMode, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return ctx
}
