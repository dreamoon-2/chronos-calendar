import { useEffect, useRef, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '../features/auth/AuthProvider'
import { ToastProvider } from '../components/ui/Toast'
import { ThemeProvider } from './theme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
})

/** 切换账号（或退出登录）时清空旧用户的缓存，避免数据串号。 */
function CacheResetOnAuth({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const prevId = useRef<string | null>(null)

  useEffect(() => {
    const id = user?.id ?? null
    if (prevId.current !== null && prevId.current !== id) {
      qc.clear()
    }
    prevId.current = id
  }, [user, qc])

  return <>{children}</>
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <CacheResetOnAuth>{children}</CacheResetOnAuth>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
