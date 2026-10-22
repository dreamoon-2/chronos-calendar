import type { TaskRow } from '../../types/database'
import { TaskPanel } from './TaskPanel'

interface TaskSheetProps {
  open: boolean
  tasks: TaskRow[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  onClose: () => void
  onCreate: (title: string) => Promise<void>
  onToggle: (task: TaskRow, done: boolean) => void
  onDelete: (task: TaskRow) => void
}

/** 移动端待办面板：不铺满全屏，方便把待办直接拖到上方时间表。 */
export function TaskSheet({
  open,
  tasks,
  loading,
  error,
  onRetry,
  onClose,
  onCreate,
  onToggle,
  onDelete,
}: TaskSheetProps) {
  if (!open) return null

  return (
    <aside
      aria-label="待办清单"
      className="chronos-task-sheet fixed inset-x-0 bottom-0 z-40 flex max-h-[58dvh] flex-col rounded-t-2xl border-t border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 md:hidden"
    >
      <div className="flex justify-center pt-2" aria-hidden="true">
        <span className="h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="min-h-0 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2">
        <TaskPanel
          variant="sheet"
          tasks={tasks}
          loading={loading}
          error={error}
          onRetry={onRetry}
          onClose={onClose}
          onCreate={onCreate}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      </div>
    </aside>
  )
}
