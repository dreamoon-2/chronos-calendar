import type { ReactNode } from 'react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { CalendarTopBar } from '../../features/calendar/CalendarTopBar'
import { PlusIcon } from '../ui/Icons'

interface AppShellProps {
  isDemo: boolean
  title: string
  currentDate: Date
  viewType: string
  zoom: number
  onChangeZoom: (zoom: number) => void
  onChangeView: (view: string) => void
  onToday: () => void
  onGotoDate: (date: Date) => void
  onCreate: () => void
  onOpenTasks: () => void
  taskCount: number
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
  currentDate,
  viewType,
  zoom,
  onChangeZoom,
  onChangeView,
  onToday,
  onGotoDate,
  onCreate,
  onOpenTasks,
  taskCount,
  onOpenSettings,
  sidebar,
  sidebarOpen = true,
  onToggleSidebar,
  children,
}: AppShellProps) {
  const online = useOnlineStatus()

  return (
    <div className="safe-area-top flex h-[100dvh] flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <CalendarTopBar
        title={title}
        currentDate={currentDate}
        viewType={viewType}
        zoom={zoom}
        onChangeZoom={onChangeZoom}
        onChangeView={onChangeView}
        onToday={onToday}
        onGotoDate={onGotoDate}
        onOpenTasks={onOpenTasks}
        taskCount={taskCount}
        onOpenSettings={onOpenSettings}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={onToggleSidebar ?? (() => {})}
      />

      {isDemo && (
        <div className="chronos-banner shrink-0 bg-amber-50/80 text-amber-800 dark:bg-amber-900/25 dark:text-amber-200">
          <span className="chronos-banner-label">演示模式</span>
          <span aria-hidden="true"> · </span>
          <span>数据仅保存在本机浏览器，不会跨设备同步</span>
        </div>
      )}
      {!online && (
        <div className="chronos-banner shrink-0 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
          当前离线：无法保存新修改，显示的数据可能不是最新
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {sidebar && sidebarOpen && (
          <aside className="chronos-sidebar hidden w-60 shrink-0 border-r border-slate-100 bg-white md:block dark:border-slate-800 dark:bg-slate-900">
            {sidebar}
          </aside>
        )}

        <main className="relative min-w-0 flex-1 overflow-hidden">
          {children}

          <div className="chronos-fab-stack">
            <button
              type="button"
              onClick={onToday}
              aria-label="回到今天"
              title="回到今天"
              className="chronos-fab chronos-fab-today"
            >
              今
            </button>
            <button
              type="button"
              onClick={onCreate}
              aria-label="新建日程"
              title="新建日程"
              className="chronos-fab chronos-fab-add"
            >
              <PlusIcon width={24} height={24} />
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
