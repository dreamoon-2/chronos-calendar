import clsx from 'clsx'
import { Button } from '../../components/ui/Button'

interface CalendarToolbarProps {
  title: string
  viewType: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onChangeView: (view: string) => void
  onCreate: () => void
  sidebarOpen?: boolean
  onToggleSidebar?: () => void
}

const VIEW_BUTTONS: { value: string; label: string; mobileOnly?: boolean }[] = [
  { value: 'timeGridWeek', label: '周' },
  { value: 'dayGridMonth', label: '月' },
  { value: 'timeGridDay', label: '日' },
  { value: 'timeGridThreeDay', label: '三日', mobileOnly: true },
]

export function CalendarToolbar({
  title,
  viewType,
  onPrev,
  onNext,
  onToday,
  onChangeView,
  onCreate,
  sidebarOpen = true,
  onToggleSidebar,
}: CalendarToolbarProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900 sm:px-5">
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

      <h1 className="min-w-[110px] text-base font-semibold text-slate-900 dark:text-white">
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

      <div className="flex w-full items-center gap-1.5 sm:w-auto">
        <div className="flex overflow-hidden rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
          {VIEW_BUTTONS.map((b) => (
            <button
              key={b.value}
              type="button"
              onClick={() => onChangeView(b.value)}
              className={clsx(
                'rounded-md px-3 py-1 text-sm font-medium transition',
                b.mobileOnly && 'sm:hidden',
                viewType === b.value
                  ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
              )}
            >
              {b.label}
            </button>
          ))}
        </div>

        <Button onClick={onCreate} className="hidden px-3 py-1.5 sm:inline-flex">
          ＋ 添加日程
        </Button>
      </div>
    </div>
  )
}
