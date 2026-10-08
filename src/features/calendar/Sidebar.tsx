import { useMemo } from 'react'
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
import type { CategoryRow } from '../../types/database'

interface SidebarProps {
  currentDate: Date
  categories: CategoryRow[]
  hiddenCategories: Set<string>
  onToggleCategory: (id: string) => void
  onShowAllCategories: () => void
  onGotoDate: (date: Date) => void
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

export function Sidebar({
  currentDate,
  categories,
  hiddenCategories,
  onToggleCategory,
  onShowAllCategories,
  onGotoDate,
}: SidebarProps) {
  const gridStart = useMemo(
    () => startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
    [currentDate],
  )
  const days = useMemo(
    () => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)),
    [gridStart],
  )

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4">
      {/* 迷你月历导航 */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {format(currentDate, 'yyyy年M月')}
          </h3>
          <div className="flex overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => onGotoDate(addMonths(currentDate, -1))}
              aria-label="上个月"
              className="px-2 py-0.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => onGotoDate(addMonths(currentDate, 1))}
              aria-label="下个月"
              className="border-l border-slate-200 px-2 py-0.5 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w) => (
            <span key={w} className="text-[10px] text-slate-400">
              {w}
            </span>
          ))}
          {days.map((d, i) => {
            const inMonth = isSameMonth(d, currentDate)
            const today = isToday(d)
            return (
              <button
                key={i}
                type="button"
                onClick={() => onGotoDate(d)}
                className={clsx(
                  'flex h-7 items-center justify-center rounded-md text-xs transition',
                  inMonth
                    ? 'text-slate-700 dark:text-slate-200'
                    : 'text-slate-300 dark:text-slate-600',
                  today
                    ? 'bg-brand-600 font-bold text-white'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800',
                )}
              >
                {format(d, 'd')}
              </button>
            )
          })}
        </div>
      </section>

      {/* 分类筛选 */}
      <section className="border-t border-slate-200 pt-4 dark:border-slate-700">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            分类筛选
          </h3>
          {hiddenCategories.size > 0 && (
            <button
              type="button"
              onClick={onShowAllCategories}
              className="text-xs text-brand-600 hover:underline dark:text-brand-300"
            >
              全部显示
            </button>
          )}
        </div>

        <ul className="space-y-0.5">
          {categories.map((c) => {
            const hidden = hiddenCategories.has(c.id)
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onToggleCategory(c.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border"
                    style={{
                      backgroundColor: hidden ? 'transparent' : c.color,
                      borderColor: c.color,
                    }}
                  />
                  <span
                    className={clsx(
                      'flex-1 truncate',
                      hidden && 'text-slate-400 line-through dark:text-slate-500',
                    )}
                  >
                    {c.name}
                  </span>
                </button>
              </li>
            )
          })}
          {categories.length === 0 && (
            <li className="text-xs text-slate-400">暂无分类，可在设置中添加。</li>
          )}
        </ul>
      </section>
    </div>
  )
}
