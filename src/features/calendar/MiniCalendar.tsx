import { useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  addDays,
  addMonths,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/ui/Icons'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

interface MiniCalendarProps {
  /** 当前定位日期：决定首次显示的月份。父级可用 key 在月份变化时重置。 */
  currentDate: Date
  onGotoDate: (date: Date) => void
  /** 紧凑模式用于标题下方的日期选择浮层。 */
  compact?: boolean
  className?: string
}

/** 迷你月历：桌面侧栏与标题日期选择共用；箭头只翻月，点日期才跳转。 */
export function MiniCalendar({ currentDate, onGotoDate, compact = false, className }: MiniCalendarProps) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(currentDate))
  const gridStart = useMemo(
    () => startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 }),
    [viewMonth],
  )
  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)), [gridStart])

  return (
    <section className={clsx('chronos-mini-calendar', className)} aria-label="选择日期">
      <div className="chronos-mini-header">
        <h3 className="chronos-mini-title">{format(viewMonth, 'yyyy年M月')}</h3>
        <div className="chronos-mini-nav">
          <button
            type="button"
            onClick={() => setViewMonth((month) => addMonths(month, -1))}
            aria-label="上个月"
            className="chronos-mini-nav-button"
          >
            <ChevronLeftIcon width={14} height={14} />
          </button>
          <button
            type="button"
            onClick={() => setViewMonth((month) => addMonths(month, 1))}
            aria-label="下个月"
            className="chronos-mini-nav-button"
          >
            <ChevronRightIcon width={14} height={14} />
          </button>
        </div>
      </div>

      <div className="chronos-mini-grid">
        {WEEKDAYS.map((w) => (
          <span key={w} className="chronos-mini-weekday">
            {w}
          </span>
        ))}
        {days.map((d, i) => {
          const inMonth = isSameMonth(d, viewMonth)
          const today = isToday(d)
          return (
            <button
              key={i}
              type="button"
              onClick={() => onGotoDate(d)}
              aria-label={format(d, 'yyyy年M月d日')}
              aria-current={today ? 'date' : undefined}
              className={clsx(
                'chronos-mini-day',
                compact ? 'h-8 text-[12px]' : 'h-7 text-xs',
                inMonth ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600',
                today && 'chronos-mini-day-today',
              )}
            >
              {format(d, 'd')}
            </button>
          )
        })}
      </div>
    </section>
  )
}
