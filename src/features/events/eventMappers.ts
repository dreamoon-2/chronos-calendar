import type { EventInput } from '@fullcalendar/react'
import type { CategoryRow, EventRow } from '../../types/database'
import { eventPalette, FALLBACK_COLOR } from '../../utils/colors'

/** 传给 FullCalendar 的事件对象，携带服务端字段用于编辑/冲突检测。 */
export interface CalendarEvent extends EventInput {
  id: string
  title: string
  extendedProps: {
    description: string
    categoryId: string | null
    categoryColor: string
    categoryName: string | null
    version: number
    allDay: boolean
    raw: EventRow
  }
}

export function toCalendarEvent(
  row: EventRow,
  category: CategoryRow | null | undefined,
): CalendarEvent {
  const accent = category?.color ?? FALLBACK_COLOR
  const palette = eventPalette(accent)
  const base: EventInput = row.all_day
    ? { start: row.start_date as string, end: row.end_date as string, allDay: true }
    : { start: row.start_at as string, end: row.end_at as string, allDay: false }

  return {
    ...base,
    id: row.id,
    title: row.title,
    // v7：color 作为事件底色（浅色），contrastColor 作为文字色（深色）。
    color: palette.background,
    contrastColor: palette.text,
    extendedProps: {
      description: row.description,
      categoryId: row.category_id,
      categoryColor: accent,
      categoryName: category?.name ?? null,
      version: row.version,
      allDay: row.all_day,
      raw: row,
    },
  } as CalendarEvent
}
