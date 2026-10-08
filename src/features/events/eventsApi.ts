import { supabase } from '../../lib/supabase'
import { demoBackend } from '../../lib/demoBackend'
import { ConflictError } from '../../lib/errors'
import { toDateOnly } from '../../lib/dates'
import type {
  CalendarRange,
  EventInsert,
  EventRow,
  EventUpdate,
} from '../../types/database'

function startMs(row: EventRow): number {
  return new Date(
    row.all_day ? `${row.start_date}T00:00:00` : (row.start_at as string),
  ).getTime()
}

/**
 * 按可视区间查询事件（区间重叠，不遗漏跨边界事件）。
 * 拆成“分时 + 全天”两条查询再合并，符合设计文档对个人数据量的建议。
 */
export async function listEvents(
  userId: string,
  range: CalendarRange,
): Promise<EventRow[]> {
  if (!supabase) return demoBackend.listEvents(range)

  const viewStart = range.start.toISOString()
  const viewEnd = range.end.toISOString()
  const dateStart = toDateOnly(range.start)
  const dateEnd = toDateOnly(range.end)

  const [timed, allDay] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .eq('all_day', false)
      .lt('start_at', viewEnd)
      .gt('end_at', viewStart),
    supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .eq('all_day', true)
      .lt('start_date', dateEnd)
      .gt('end_date', dateStart),
  ])

  if (timed.error) throw timed.error
  if (allDay.error) throw allDay.error

  const rows = [...(timed.data ?? []), ...(allDay.data ?? [])] as EventRow[]
  return rows.sort((a, b) => startMs(a) - startMs(b))
}

export async function createEvent(
  userId: string,
  input: EventInsert,
): Promise<EventRow> {
  if (!supabase) return demoBackend.createEvent(input)
  const { data, error } = await supabase
    .from('events')
    .insert({ ...input, user_id: userId })
    .select('*')
    .single()
  if (error) throw error
  return data as EventRow
}

/** 乐观并发：以 version 作为过滤条件；无返回行即冲突。 */
export async function updateEvent(
  userId: string,
  id: string,
  version: number,
  patch: EventUpdate,
): Promise<EventRow> {
  if (!supabase) return demoBackend.updateEvent(id, version, patch)
  const { data, error } = await supabase
    .from('events')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .eq('version', version)
    .select('*')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new ConflictError()
  return data as EventRow
}

/** 软删除：更新 deleted_at，同样使用 version 条件。 */
export async function softDeleteEvent(
  userId: string,
  id: string,
  version: number,
): Promise<void> {
  if (!supabase) return demoBackend.softDeleteEvent(id, version)
  const { data, error } = await supabase
    .from('events')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .eq('version', version)
    .select('id')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new ConflictError()
}
