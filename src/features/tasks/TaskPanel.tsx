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

/** 待办清单：桌面侧栏与移动端底部抽屉共用。 */
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
      id={variant === 'sidebar' ? 'chronos-task-panel' : undefined}
      className={clsx('chronos-task-panel', variant === 'sheet' ? 'is-sheet' : 'is-sidebar')}
      aria-label="待办清单"
      data-task-dropzone="true"
    >
      <div className="chronos-task-header">
        <h3>
          待办清单
          <span className="chronos-task-count">{active.length}</span>
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭待办清单"
            className="chronos-task-close"
          >
            收起
          </button>
        )}
      </div>

      <form onSubmit={(event) => void submit(event)} className="chronos-task-form">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="添加待办，回车确认"
          aria-label="新待办"
          maxLength={120}
          className="chronos-task-input"
        />
        <button
          type="submit"
          disabled={!title.trim() || creating}
          aria-label="添加待办"
          className="chronos-task-add"
        >
          ＋
        </button>
      </form>

      <p className="chronos-task-hint">
        {variant === 'sheet'
          ? '长按待办并拖到上方时间表即可安排；放下后自动标记完成。'
          : '拖动待办到日历即可安排时间；放下后自动标记完成。'}
      </p>

      {error && (
        <div role="alert" className="chronos-task-error">
          <p>{error}</p>
          {onRetry && (
            <button type="button" onClick={onRetry}>
              执行迁移后点此重试
            </button>
          )}
        </div>
      )}

      {loading && !error && <p className="chronos-task-empty">正在加载待办…</p>}
      {!loading && !error && active.length === 0 && (
        <p className="chronos-task-empty">暂无待办，先写下要做的事。</p>
      )}

      <ul ref={listRef} className="chronos-task-list">
        {active.map((task) => (
          <li
            key={task.id}
            data-task-id={task.id}
            data-task-title={task.title}
            data-task-duration={task.estimated_minutes}
            title="拖到日历安排时间"
            className="chronos-task-item chronos-task-item--active"
          >
            <input
              type="checkbox"
              aria-label={`完成待办 ${task.title}`}
              onPointerDown={(event) => event.stopPropagation()}
              onChange={(event) => onToggle(task, event.target.checked)}
              className="chronos-task-check"
            />
            <span className="chronos-task-title">{task.title}</span>
            <button
              type="button"
              aria-label={`删除待办 ${task.title}`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onDelete(task)}
              className="chronos-task-delete"
            >
              ×
            </button>
            <span aria-hidden="true" className="chronos-task-grip">⠿</span>
          </li>
        ))}
      </ul>

      {done.length > 0 && (
        <details className="chronos-task-done">
          <summary>已完成 {done.length}</summary>
          <ul className="chronos-task-list is-done">
            {done.map((task) => (
              <li key={task.id} className="chronos-task-item is-done">
                <input
                  type="checkbox"
                  aria-label={`恢复待办 ${task.title}`}
                  checked
                  onPointerDown={(event) => event.stopPropagation()}
                  onChange={(event) => onToggle(task, event.target.checked)}
                  className="chronos-task-check"
                />
                <span className="chronos-task-title">{task.title}</span>
                <button
                  type="button"
                  aria-label={`删除待办 ${task.title}`}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => onDelete(task)}
                  className="chronos-task-delete"
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
