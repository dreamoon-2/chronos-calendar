import { useAuth } from '../../features/auth/AuthProvider'
import { useTheme } from '../../app/theme'

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
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-lg text-white">
          📅
        </div>
        <span className="text-base font-semibold text-slate-900 dark:text-white">
          Chronos
        </span>
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
