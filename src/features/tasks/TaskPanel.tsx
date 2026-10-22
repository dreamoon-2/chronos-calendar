import { useMemo, useRef, useState, type FormEvent } from 'react'
import clsx from 'clsx'
import type { TaskRow } from '../../types/database'
import { useTaskDraggable } from './useTaskDraggable'

interface TaskPanelProps {
  tasks: TaskRow[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  variant?: 'sidebar' | 'sheet'
  onClose?: () => void
  onCreate: (title: string) => Promise<void>
  onToggle: (task: TaskRow, done: boolean) => void
  onDelete: (task: TaskRow) => void
}

export function TaskPanel({
  tasks,
  loading = false,
  error = null,
  onRetry,
  variant = 'sidebar',
  onClose,
  onCreate,
  onToggle,
  onDelete,
}: TaskPanelProps) {
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)
  useTaskDraggable(listRef)

  const { active, done } = useMemo(
    () => ({
      active: tasks.filter((task) => !task.done),
      done: tasks.filter((task) => task.done),
    }),
    [tasks],
  )

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const next = title.trim()
    if (!next || creating) return
    setCreating(true)
    try {
      await onCreate(next)
      setTitle('')
    } catch {
      // 父级已经显示具体错误；保留输入，方便重试。
    } finally {
      setCreating(false)
    }
  }

  return (
    <section
      className={clsx(
        'flex flex-col',
        variant === 'sidebar' && 'shrink-0 border-t border-slate-200 pt-4 dark:border-slate-700',
      )}
      aria-label="待办清单"
      data-task-dropzone="true"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          待办清单
          <span className="ml-1.5 text-xs font-normal text-slate-400">{active.length}</span>
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭待办清单"
            className="rounded-md p-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            收起
          </button>
        )}
      </div>

      <form onSubmit={(event) => void submit(event)} className="mb-2 flex gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="添加待办，回车确认"
          aria-label="新待办"
          maxLength={120}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <button
          type="submit"
          disabled={!title.trim() || creating}
          aria-label="添加待办"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-lg text-white transition hover:bg-brand-700 disabled:opacity-40"
        >
          ＋
        </button>
      </form>

      <p className="mb-2 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
        {variant === 'sheet'
          ? '长按待办并拖到上方时间表即可安排；放下后自动标记完成。'
          : '拖动待办到日历即可安排时间；放下后自动标记完成。'}
      </p>

      {error && (
        <div role="alert" className="mb-2 rounded-lg bg-red-50 px-2.5 py-2 text-[11px] leading-relaxed text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <p>{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-1.5 font-semibold underline underline-offset-2"
            >
              执行迁移后点此重试
            </button>
          )}
        </div>
      )}

      {loading && !error && <p className="py-3 text-xs text-slate-400">正在加载待办…</p>}
      {!loading && !error && active.length === 0 && (
        <p className="py-3 text-center text-xs text-slate-400">暂无待办，先写下要做的事。</p>
      )}

      <ul
        ref={listRef}
        className={clsx(
          'space-y-1.5',
          variant === 'sidebar' && 'max-h-56 overflow-y-auto pr-0.5',
        )}
      >
        {active.map((task) => (
          <li
            key={task.id}
            data-task-id={task.id}
            data-task-title={task.title}
            data-task-duration={task.estimated_minutes}
            title="拖到日历安排时间"
            className="chronos-task-item chronos-task-item--active group flex cursor-grab items-start gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 active:cursor-grabbing dark:border-slate-700 dark:bg-slate-900"
          >
            <input
              type="checkbox"
              aria-label={`完成待办 ${task.title}`}
              onPointerDown={(event) => event.stopPropagation()}
              onChange={(event) => onToggle(task, event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="min-w-0 flex-1 break-words text-sm leading-snug text-slate-700 dark:text-slate-200">
              {task.title}
            </span>
            <button
              type="button"
              aria-label={`删除待办 ${task.title}`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onDelete(task)}
              className="mt-0.5 shrink-0 rounded px-1 text-xs text-slate-400 opacity-0 transition hover:text-red-500 focus:opacity-100 group-hover:opacity-100"
            >
              ×
            </button>
            <span aria-hidden="true" className="mt-0.5 shrink-0 select-none text-xs text-slate-300 dark:text-slate-600">
              ⠿
            </span>
          </li>
        ))}
      </ul>

      {done.length > 0 && (
        <details className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
          <summary className="cursor-pointer select-none text-xs text-slate-400">
            已完成 {done.length}
          </summary>
          <ul className="mt-1.5 space-y-1">
            {done.map((task) => (
              <li
                key={task.id}
                className="chronos-task-item group flex items-start gap-2 rounded-lg px-2.5 py-1.5"
              >
                <input
                  type="checkbox"
                  aria-label={`恢复待办 ${task.title}`}
                  checked
                  onPointerDown={(event) => event.stopPropagation()}
                  onChange={(event) => onToggle(task, event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="min-w-0 flex-1 break-words text-sm leading-snug text-slate-400 line-through dark:text-slate-500">
                  {task.title}
                </span>
                <button
                  type="button"
                  aria-label={`删除待办 ${task.title}`}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => onDelete(task)}
                  className="shrink-0 rounded px-1 text-xs text-slate-400 opacity-0 transition hover:text-red-500 focus:opacity-100 group-hover:opacity-100"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
