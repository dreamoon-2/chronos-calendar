// 与 supabase/migrations/202610080001_initial_schema.sql、
// 202610190001_tasks.sql 及 202610200001_task_event_link.sql 对齐的数据类型。

export interface CategoryRow {
  id: string
  user_id: string
  name: string
  color: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface EventRow {
  id: string
  user_id: string
  category_id: string | null
  task_id: string | null
  title: string
  description: string
  all_day: boolean
  start_at: string | null
  end_at: string | null
  start_date: string | null
  end_date: string | null
  deleted_at: string | null
  version: number
  created_at: string
  updated_at: string
}

/** 表单/插入时使用的分类载荷。 */
export interface CategoryInsert {
  name: string
  color: string
  sort_order: number
}

/** 表单/插入时使用的事件载荷（分时与全天二选一，由 all_day 决定）。 */
export interface EventInsert {
  title: string
  description: string
  all_day: boolean
  category_id: string | null
  /** 由待办排入时关联的待办 ID；普通日程为 null。 */
  task_id?: string | null
  start_at: string | null
  end_at: string | null
  start_date: string | null
  end_date: string | null
}

export interface TaskRow {
  id: string
  user_id: string
  title: string
  notes: string
  done: boolean
  estimated_minutes: number
  category_id: string | null
  created_at: string
  updated_at: string
}

/** 新建待办载荷；账号由调用方传入，分钟数与分类可省略。 */
export interface TaskInsert {
  title: string
  notes?: string
  estimated_minutes?: number
  category_id?: string | null
}

/** 待办更新载荷（目前只修改标题、备注、完成状态与预计时长）。 */
export interface TaskUpdate {
  title?: string
  notes?: string
  done?: boolean
  estimated_minutes?: number
  category_id?: string | null
}

/** 日历可视区间（exclusive end）。 */
export interface CalendarRange {
  start: Date
  end: Date
}

/** 事件更新载荷（不含 version，version 由调用方作为过滤条件传入）。 */
export type EventUpdate = Partial<EventInsert>
