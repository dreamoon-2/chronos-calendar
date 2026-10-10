import clsx from 'clsx'
import { Button } from '../../components/ui/Button'
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from './useCalendarZoom'

interface CalendarToolbarProps {
  title: string
  viewType: string
  zoom: number
  onChangeZoom: (zoom: number) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onChangeView: (view: string) => void
  onCreate: () => void
  onOpenDrafts: () => void
  sidebarOpen?: boolean
  onToggleSidebar?: () => void
}

const VIEW_BUTTONS: { value: string; label: string }[] = [
  { value: 'multiMonthYear', label: '年' },
  { value: 'dayGridMonth', label: '月' },
  { value: 'timeGridWeek', label: '周' },
  { value: 'timeGridDay', label: '日' },
]

export function CalendarToolbar({
  title,
  viewType,
  zoom,
  onChangeZoom,
  onPrev,
  onNext,
  onToday,
  onChangeView,
  onCreate,
  onOpenDrafts,
  sidebarOpen = true,
  onToggleSidebar,
}: CalendarToolbarProps) {
  return (
    <div className="chronos-toolbar flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-100 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-5">
      {onToggleSidebar && (
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="切换侧栏"
          title="切换侧栏"
          className="hidden items-center justify-center rounded-lg px-2 py-1.5 text-base text-slate-500 hover:bg-slate-100 md:inline-flex dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {sidebarOpen ? '«' : '»'}
        </button>
      )}

      <h1 className="min-w-[110px] text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
        {title}
      </h1>

      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="secondary" onClick={onToday} className="px-3 py-1.5 text-xs">
          今天
        </Button>
        <div className="flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onPrev}
            aria-label="上一段"
            className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="下一段"
            className="border-l border-slate-200 px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ›
          </button>
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
        <div role="group" aria-label="日历视图" className="flex overflow-hidden rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
          {VIEW_BUTTONS.map((b) => (
            <button
              key={b.value}
              type="button"
              onClick={() => onChangeView(b.value)}
              aria-pressed={viewType === b.value}
              className={clsx(
                'rounded-md px-3 py-1 text-sm font-medium transition',
                viewType === b.value
                  ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
              )}
            >
              {b.label}
            </button>
          ))}
        </div>

          <div
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-1 dark:border-slate-700"
            role="group"
            aria-label={viewType.startsWith('timeGrid') ? '时间轴缩放' : '日历缩放'}
          >
            <button
              type="button"
              aria-label="缩小时间表"
              title="缩小时间表"
              disabled={zoom <= MIN_ZOOM}
              onClick={() => onChangeZoom(zoom - ZOOM_STEP)}
              className="rounded px-2 py-1 text-lg hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
            >
              −
            </button>
            <input
              type="range"
              aria-label="时间表缩放比例"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={ZOOM_STEP}
              value={zoom}
              onChange={(e) => onChangeZoom(Number(e.target.value))}
              className="w-16 accent-brand-600 lg:w-20"
            />
            <button
              type="button"
              aria-label="放大时间表"
              title="放大时间表"
              disabled={zoom >= MAX_ZOOM}
              onClick={() => onChangeZoom(zoom + ZOOM_STEP)}
              className="rounded px-2 py-1 text-lg hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
            >
              ＋
            </button>
            <button
              type="button"
              aria-label="重置时间表缩放"
              title="恢复 100%"
              onClick={() => onChangeZoom(100)}
              className="w-12 rounded px-1 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {zoom}%
            </button>
          </div>

        <Button variant="secondary" onClick={onOpenDrafts} className="px-3 py-1.5 text-xs">日程草稿</Button>
        <Button onClick={onCreate} className="hidden px-3 py-1.5 sm:inline-flex">
          ＋ 添加日程
        </Button>
      </div>
    </div>
  )
}
