import { describe, expect, it } from 'vitest'
import { toCalendarEvent } from '../../../../src/features/events/eventMappers'
import { eventPalette } from '../../../../src/utils/colors'
import type { CategoryRow, EventRow } from '../../../../src/types/database'

const category: CategoryRow = {
  id: 'cat-1',
  user_id: 'u1',
  name: '课程',
  color: '#d97706',
  sort_order: 0,
  created_at: '',
  updated_at: '',
}

function timedRow(): EventRow {
  return {
    id: 'ev-1',
    user_id: 'u1',
    category_id: 'cat-1',
    title: '机器学习',
    description: '备注',
    all_day: false,
    start_at: '2026-10-08T01:00:00+00:00',
    end_at: '2026-10-08T02:30:00+00:00',
    start_date: null,
    end_date: null,
    deleted_at: null,
    version: 3,
    created_at: '',
    updated_at: '',
  }
}

function allDayRow(): EventRow {
  return {
    id: 'ev-2',
    user_id: 'u1',
    category_id: null,
    title: '全天',
    description: '',
    all_day: true,
    start_at: null,
    end_at: null,
    start_date: '2026-10-08',
    end_date: '2026-10-09',
    deleted_at: null,
    version: 1,
    created_at: '',
    updated_at: '',
  }
}

describe('toCalendarEvent', () => {
  it('maps timed rows with color/contrast and keeps version in extendedProps', () => {
    const ev = toCalendarEvent(timedRow(), category)
    expect(ev.allDay).toBe(false)
    expect(ev.start).toBe('2026-10-08T01:00:00+00:00')
    expect(ev.end).toBe('2026-10-08T02:30:00+00:00')
    expect(ev.color).toBe(eventPalette('#d97706').background)
    expect(ev.contrastColor).toBe(eventPalette('#d97706').text)
    expect(ev.extendedProps.version).toBe(3)
    expect(ev.extendedProps.categoryName).toBe('课程')
    expect(ev.extendedProps.raw.id).toBe('ev-1')
  })

  it('maps all-day rows with exclusive-end date strings', () => {
    const ev = toCalendarEvent(allDayRow(), null)
    expect(ev.allDay).toBe(true)
    expect(ev.start).toBe('2026-10-08')
    expect(ev.end).toBe('2026-10-09')
    expect(ev.extendedProps.categoryId).toBeNull()
  })
})
