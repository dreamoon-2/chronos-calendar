import { describe, expect, it } from 'vitest'
import {
  emptyForm,
  eventToForm,
  formToEventInsert,
  validateEventForm,
  type EventFormValues,
} from '../../src/features/events/eventSchema'
import type { EventRow } from '../../src/types/database'

function timed(values: Partial<EventFormValues> = {}): EventFormValues {
  return {
    ...emptyForm(),
    title: '课程',
    allDay: false,
    startDate: '2026-10-08',
    startTime: '09:00',
    endDate: '2026-10-08',
    endTime: '10:00',
    ...values,
  }
}

describe('validateEventForm', () => {
  it('rejects blank title', () => {
    const errors = validateEventForm(timed({ title: '   ' }))
    expect(errors.title).toBeTruthy()
  })

  it('rejects end earlier than start (timed)', () => {
    const errors = validateEventForm(timed({ startTime: '10:00', endTime: '09:00' }))
    expect(errors.endTime).toBeTruthy()
  })

  it('allows cross-day timed events', () => {
    const errors = validateEventForm(
      timed({ startDate: '2026-10-08', startTime: '23:00', endDate: '2026-10-09', endTime: '01:00' }),
    )
    expect(errors.endTime).toBeUndefined()
  })

  it('rejects all-day end before start', () => {
    const errors = validateEventForm(
      timed({ allDay: true, startDate: '2026-10-10', endDate: '2026-10-09' }),
    )
    expect(errors.endDate).toBeTruthy()
  })
})

describe('formToEventInsert', () => {
  it('produces UTC timestamps for timed events', () => {
    const out = formToEventInsert(timed())
    expect(out.all_day).toBe(false)
    expect(out.start_at).toBe(new Date('2026-10-08T09:00:00').toISOString())
    expect(out.end_at).toBe(new Date('2026-10-08T10:00:00').toISOString())
    expect(out.start_date).toBeNull()
    expect(out.end_date).toBeNull()
  })

  it('produces exclusive-end dates for all-day events', () => {
    const out = formToEventInsert(
      timed({ allDay: true, startDate: '2026-10-08', endDate: '2026-10-08' }),
    )
    expect(out.all_day).toBe(true)
    expect(out.start_date).toBe('2026-10-08')
    expect(out.end_date).toBe('2026-10-09')
    expect(out.start_at).toBeNull()
    expect(out.end_at).toBeNull()
  })
})

describe('eventToForm', () => {
  it('round-trips an all-day row back to inclusive form dates', () => {
    const row: EventRow = {
      id: '1',
      user_id: 'u',
      category_id: null,
      title: 'x',
      description: '',
      all_day: true,
      start_at: null,
      end_at: null,
      start_date: '2026-10-08',
      end_date: '2026-10-10',
      deleted_at: null,
      version: 1,
      created_at: '',
      updated_at: '',
    }
    const form = eventToForm(row)
    expect(form.allDay).toBe(true)
    expect(form.startDate).toBe('2026-10-08')
    expect(form.endDate).toBe('2026-10-09')
  })
})
