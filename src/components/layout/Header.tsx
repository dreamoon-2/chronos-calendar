import { useAuth } from '../../features/auth/AuthProvider'
import { useTheme } from '../../app/theme'
import { version } from '../../../package.json'

interface HeaderProps {
  isDemo: boolean
  onOpenSettings: () => void
}

export function Header({ isDemo, onOpenSettings }: HeaderProps) {
  const { user, signOut } = useAuth()
  const { theme, toggle } = useTheme()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900 sm:px-5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-brand-600 dark:bg-sky-950">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4m8-4v4m-9 8h3" /></svg>
        </div>
        <span className="text-base font-semibold text-slate-900 dark:text-white">
          Chronos
        </span>
        <span className="hidden text-xs text-slate-400 sm:inline">v{version}</span>
        {isDemo && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            演示模式
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {user?.email && (
          <span className="hidden max-w-[180px] truncate text-xs text-slate-500 dark:text-slate-400 md:block">
            {user.email}
          </span>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label="切换深浅色"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="设置"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          ⚙️
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          退出
        </button>
      </div>
    </header>
  )
}
