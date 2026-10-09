import type { ReactNode } from 'react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { CalendarToolbar } from '../../features/calendar/CalendarToolbar'
import { Header } from './Header'

interface AppShellProps {
  isDemo: boolean
  title: string
  viewType: string
  zoom: number
  onChangeZoom: (zoom: number) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onChangeView: (view: string) => void
  onCreate: () => void
  onOpenSettings: () => void
  /** 桌面端侧栏（迷你月历 + 分类筛选）。 */
  sidebar?: ReactNode
  sidebarOpen?: boolean
  onToggleSidebar?: () => void
  children: ReactNode
}

export function AppShell({
  isDemo,
  title,
  viewType,
  zoom,
  onChangeZoom,
  onPrev,
  onNext,
  onToday,
  onChangeView,
  onCreate,
  onOpenSettings,
  sidebar,
  sidebarOpen = true,
  onToggleSidebar,
  children,
}: AppShellProps) {
  const online = useOnlineStatus()

  return (
    <div className="safe-area-top flex h-[100dvh] flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Header isDemo={isDemo} onOpenSettings={onOpenSettings} />

      {isDemo && (
        <div className="shrink-0 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          演示模式：数据仅保存在本机浏览器，不会跨设备同步。配置 Supabase 凭证后自动切换为真实同步。
        </div>
      )}
      {!online && (
        <div className="shrink-0 bg-red-50 px-4 py-1.5 text-center text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
          当前离线：无法保存新修改，当前显示的数据可能不是最新。
        </div>
      )}

      <CalendarToolbar
        title={title}
        viewType={viewType}
        zoom={zoom}
        onChangeZoom={onChangeZoom}
        onPrev={onPrev}
        onNext={onNext}
        onToday={onToday}
        onChangeView={onChangeView}
        onCreate={onCreate}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={onToggleSidebar}
      />

      <div className="flex flex-1 overflow-hidden">
        {sidebar && sidebarOpen && (
          <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block dark:border-slate-800 dark:bg-slate-900">
            {sidebar}
          </aside>
        )}

        <main className="relative min-w-0 flex-1 overflow-hidden">
          {children}

          <div className="absolute right-4 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-30 flex flex-col items-end gap-3 sm:hidden">
            <button
              type="button"
              onClick={onToday}
              className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-brand-700 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              今天
            </button>
            <button
              type="button"
              onClick={onCreate}
              aria-label="新建日程"
              className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-100 bg-white text-3xl font-light text-slate-900 shadow-xl transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              ＋
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
