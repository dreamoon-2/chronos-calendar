import type { EventInsert, EventRow } from '../../types/database'
import {
  combineDateAndTime,
  toDateOnly,
  toExclusiveEndDate,
  toInclusiveEndDate,
  splitDateTime,
} from '../../lib/dates'

export interface EventFormValues {
  title: string
  description: string
  allDay: boolean
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  categoryId: string | null
}

export type EventFormErrors = Partial<Record<keyof EventFormValues, string>>

export function emptyForm(initial?: Partial<EventFormValues>): EventFormValues {
  const today = toDateOnly(new Date())
  return {
    title: '',
    description: '',
    allDay: false,
    startDate: today,
    startTime: '09:00',
    endDate: today,
    endTime: '10:00',
    categoryId: null,
    ...initial,
  }
}

export function validateEventForm(v: EventFormValues): EventFormErrors {
  const errors: EventFormErrors = {}
  if (!v.title.trim()) errors.title = '标题不能为空'

  if (!v.allDay) {
    if (!v.startTime || !v.endTime) {
      errors.endTime = '请填写开始与结束时间'
    } else {
      const start = new Date(`${v.startDate}T${v.startTime}:00`).getTime()
      const end = new Date(`${v.endDate}T${v.endTime}:00`).getTime()
      if (Number.isNaN(start) || Number.isNaN(end)) {
        errors.endTime = '时间格式无效'
      } else if (end <= start) {
        errors.endTime = '结束时间必须晚于开始时间'
      }
    }
  } else if (v.endDate < v.startDate) {
    errors.endDate = '结束日期不能早于开始日期'
  }
  return errors
}

export function formToEventInsert(v: EventFormValues): EventInsert {
  const base = {
    title: v.title.trim(),
    description: v.description,
    category_id: v.categoryId,
  }
  if (v.allDay) {
    return {
      ...base,
      all_day: true,
      start_date: v.startDate,
      end_date: toExclusiveEndDate(v.endDate),
      start_at: null,
      end_at: null,
    }
  }
  return {
    ...base,
    all_day: false,
    start_at: combineDateAndTime(v.startDate, v.startTime),
    end_at: combineDateAndTime(v.endDate, v.endTime),
    start_date: null,
    end_date: null,
  }
}

export function eventToForm(row: EventRow): EventFormValues {
  if (row.all_day) {
    return {
      title: row.title,
      description: row.description,
      allDay: true,
      startDate: row.start_date as string,
      endDate: toInclusiveEndDate(row.end_date as string),
      startTime: '09:00',
      endTime: '10:00',
      categoryId: row.category_id,
    }
  }
  const start = splitDateTime(row.start_at as string)
  const end = splitDateTime(row.end_at as string)
  return {
    title: row.title,
    description: row.description,
    allDay: false,
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
    categoryId: row.category_id,
  }
}
