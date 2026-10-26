import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { version } from '../../../package.json'
import { useAuth } from '../auth/AuthProvider'
import { useTheme } from '../../app/theme'
import {
  CalendarIcon,
  LogoutIcon,
  MoreIcon,
  SettingsIcon,
  SidebarIcon,
  TaskListIcon,
  ThemeIcon,
  TodayIcon,
} from '../../components/ui/Icons'
import { CALENDAR_VIEWS, activeViewIndex } from './calendarViews'
import { MiniCalendar } from './MiniCalendar'
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from './useCalendarZoom'

interface CalendarTopBarProps {
  title: string
  currentDate: Date
  viewType: string
  zoom: number
  onChangeZoom: (zoom: number) => void
  onChangeView: (view: string) => void
  onToday: () => void
  onGotoDate: (date: Date) => void
  onOpenTasks: () => void
  taskCount: number
  onOpenSettings: () => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

/** 大标题 + 视图标签 + 图标操作：替代旧版应用顶栏与功能栏。 */
export function CalendarTopBar({
  title,
  currentDate,
  viewType,
  zoom,
  onChangeZoom,
  onChangeView,
  onToday,
  onGotoDate,
  onOpenTasks,
  taskCount,
  onOpenSettings,
  sidebarOpen,
  onToggleSidebar,
}: CalendarTopBarProps) {
  const { user, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pickerTriggerRef = useRef<HTMLDivElement>(null)
  const pickerPanelRef = useRef<HTMLDivElement>(null)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const menuPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pickerOpen && !menuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (pickerOpen) {
        const insideTrigger = pickerTriggerRef.current?.contains(target)
        const insidePanel = pickerPanelRef.current?.contains(target)
        if (!insideTrigger && !insidePanel) setPickerOpen(false)
      }
      if (menuOpen) {
        const insideTrigger = menuTriggerRef.current?.contains(target)
        const insidePanel = menuPanelRef.current?.contains(target)
        if (!insideTrigger && !insidePanel) setMenuOpen(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setPickerOpen(false)
      setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [pickerOpen, menuOpen])

  const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`
  const activeIndex = activeViewIndex(viewType)
  const closePopovers = () => {
    setPickerOpen(false)
    setMenuOpen(false)
  }

  return (
    <header className="chronos-topbar relative z-30 shrink-0 bg-white dark:bg-slate-900">
      <div className="chronos-topbar-main">
        <div ref={pickerTriggerRef} className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            className="chronos-icon-button chronos-picker-icon"
            aria-label="打开日期选择"
            aria-expanded={pickerOpen}
            aria-haspopup="dialog"
            onClick={() => {
              setMenuOpen(false)
              setPickerOpen((open) => !open)
            }}
          >
            <CalendarIcon width={22} height={22} />
          </button>
          <h1 className="chronos-title min-w-0">
            <button
              type="button"
              className="chronos-title-button"
              aria-label={`选择日期，当前显示 ${title}`}
              aria-expanded={pickerOpen}
              aria-haspopup="dialog"
              onClick={() => {
                setMenuOpen(false)
                setPickerOpen((open) => !open)
              }}
            >
              <TitleText title={title} />
            </button>
          </h1>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className="chronos-icon-button"
            aria-label="回到今天"
            title="回到今天"
            onClick={() => {
              closePopovers()
              onToday()
            }}
          >
            <TodayIcon />
          </button>
          <button
            type="button"
            className="chronos-icon-button chronos-task-trigger"
            aria-label="待办清单"
            title={taskCount > 0 ? `待办清单（${taskCount} 项待办）` : '待办清单'}
            onClick={() => {
              closePopovers()
              onOpenTasks()
            }}
          >
            <TaskListIcon />
            {taskCount > 0 && (
              <span className="chronos-icon-badge" aria-hidden="true">
                {taskCount > 99 ? '99+' : taskCount}
              </span>
            )}
          </button>
          <button
            ref={menuTriggerRef}
            type="button"
            className={clsx('chronos-icon-button', menuOpen && 'is-active')}
            aria-label="更多操作"
            title="更多操作"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => {
              setPickerOpen(false)
              setMenuOpen((open) => !open)
            }}
          >
            <MoreIcon />
          </button>
        </div>
      </div>

      <div role="group" aria-label="日历视图" className="chronos-view-tabs">
        <span
          aria-hidden="true"
          className="chronos-view-indicator"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        >
          <i />
        </span>
        {CALENDAR_VIEWS.map((view) => (
          <button
            key={view.value}
            type="button"
            onClick={() => {
              closePopovers()
              onChangeView(view.value)
            }}
            aria-pressed={viewType === view.value}
            className={clsx('chronos-view-tab', viewType === view.value && 'is-active')}
          >
            {view.label}
          </button>
        ))}
      </div>

      {pickerOpen && (
        <div
          ref={pickerPanelRef}
          className="chronos-popover chronos-date-popover"
          role="dialog"
          aria-label="选择日期"
        >
          <MiniCalendar
            key={monthKey}
            compact
            currentDate={currentDate}
            onGotoDate={(date) => {
              setPickerOpen(false)
              onGotoDate(date)
            }}
          />
          <div className="chronos-date-popover-footer">
            <button
              type="button"
              className="chronos-date-today"
              onClick={() => {
                setPickerOpen(false)
                onToday()
              }}
            >
              回到今天
            </button>
          </div>
        </div>
      )}

      {menuOpen && (
        <div
          ref={menuPanelRef}
          className="chronos-popover chronos-menu"
          role="menu"
          aria-label="更多操作"
        >
          <div className="chronos-menu-section" role="group" aria-label="时间轴缩放">
            <span className="chronos-menu-label">时间轴</span>
            <div className="chronos-zoom">
              <button
                type="button"
                aria-label="缩小时间轴"
                title="缩小时间轴"
                disabled={zoom <= MIN_ZOOM}
                onClick={() => onChangeZoom(zoom - ZOOM_STEP)}
              >
                −
              </button>
              <button
                type="button"
                className="chronos-zoom-value"
                aria-label="重置时间轴缩放"
                title="恢复 100%"
                onClick={() => onChangeZoom(100)}
              >
                {zoom}%
              </button>
              <button
                type="button"
                aria-label="放大时间轴"
                title="放大时间轴"
                disabled={zoom >= MAX_ZOOM}
                onClick={() => onChangeZoom(zoom + ZOOM_STEP)}
              >
                ＋
              </button>
            </div>
          </div>

          <div className="chronos-menu-divider" />

          <button
            type="button"
            role="menuitem"
            className="chronos-menu-item hidden md:flex"
            onClick={() => {
              closePopovers()
              onToggleSidebar()
            }}
          >
            <SidebarIcon />
            <span>{sidebarOpen ? '隐藏侧栏' : '显示侧栏'}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="chronos-menu-item"
            onClick={() => {
              closePopovers()
              onOpenTasks()
            }}
          >
            <TaskListIcon />
            <span>待办清单</span>
            {taskCount > 0 && <span className="chronos-menu-badge">{taskCount}</span>}
          </button>
          <button
            type="button"
            role="menuitem"
            className="chronos-menu-item"
            onClick={() => {
              closePopovers()
              onOpenSettings()
            }}
          >
            <SettingsIcon />
            <span>设置</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="chronos-menu-item"
            onClick={() => {
              closePopovers()
              toggle()
            }}
          >
            <ThemeIcon dark={theme === 'dark'} />
            <span>{theme === 'dark' ? '浅色模式' : '深色模式'}</span>
          </button>

          <div className="chronos-menu-divider" />

          {user?.email && <p className="chronos-menu-account">{user.email}</p>}
          <button
            type="button"
            role="menuitem"
            className="chronos-menu-item"
            onClick={() => {
              closePopovers()
              void signOut()
            }}
          >
            <LogoutIcon />
            <span>退出登录</span>
          </button>

          <p className="chronos-menu-version">Chronos v{version}</p>
        </div>
      )}
    </header>
  )
}

function TitleText({ title }: { title: string }) {
  const slash = /^(\d{4})\/(\d{1,2})$/.exec(title)
  if (slash) {
    return (
      <>
        <span>{slash[1]}</span>
        <span className="chronos-title-sep">/</span>
        <span>{slash[2]}</span>
      </>
    )
  }
  const year = /^(\d{4})年$/.exec(title)
  if (year) {
    return (
      <>
        <span>{year[1]}</span>
        <span className="chronos-title-sep">年</span>
      </>
    )
  }
  return <>{title}</>
}
