// 与 supabase/migrations/202610080001_initial_schema.sql 对齐的数据类型。

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
  start_at: string | null
  end_at: string | null
  start_date: string | null
  end_date: string | null
}

/** 日历可视区间（exclusive end）。 */
export interface CalendarRange {
  start: Date
  end: Date
}

/** 事件更新载荷（不含 version，version 由调用方作为过滤条件传入）。 */
export type EventUpdate = Partial<EventInsert>
