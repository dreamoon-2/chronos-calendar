import { useState } from 'react'
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

type Direction = 'forward' | 'back' | null

/**
 * 登录 ↔ 日历的整页滑动切换。
 * 首次加载不播放动画；账号状态变化时在渲染阶段同步切换方向，避免先播旧方向。
 */
export function AppRoutes() {
  const { user, loading } = useAuth()
  const signedIn = Boolean(user)
  const [lastSession, setLastSession] = useState<{ signedIn: boolean; direction: Direction }>(
    () => ({ signedIn, direction: null }),
  )

  let direction = lastSession.direction
  if (lastSession.signedIn !== signedIn) {
    direction = signedIn ? 'forward' : 'back'
    setLastSession({ signedIn, direction })
  }

  if (loading) return <Splash />
  return (
    <div
      key={signedIn ? 'calendar' : 'login'}
      className={`h-full ${
        direction === 'forward'
          ? 'chronos-page-enter-forward'
          : direction === 'back'
            ? 'chronos-page-enter-back'
            : ''
      }`}
    >
      {signedIn ? <CalendarPage /> : <LoginPage />}
    </div>
  )
}
