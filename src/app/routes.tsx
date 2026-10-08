import { useAuth } from '../features/auth/AuthProvider'
import { LoginPage } from '../features/auth/LoginPage'
import { CalendarPage } from '../features/calendar/CalendarPage'

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
      <div className="animate-pulse text-slate-400">加载中…</div>
    </div>
  )
}

export function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  if (!user) return <LoginPage />
  return <CalendarPage />
}
