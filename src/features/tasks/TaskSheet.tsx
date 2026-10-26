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
    <aside aria-label="待办清单" className="chronos-task-sheet md:hidden">
      <div className="chronos-task-sheet-grip" aria-hidden="true">
        <span />
      </div>
      <div className="chronos-task-sheet-body">
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
