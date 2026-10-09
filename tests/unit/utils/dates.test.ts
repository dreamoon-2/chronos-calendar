import { describe, expect, it } from 'vitest'
import {
  addDaysToDateString,
  combineDateAndTime,
  eventOverlapsRange,
  splitDateTime,
  toDateOnly,
  toExclusiveEndDate,
  toInclusiveEndDate,
} from '../../../src/utils/dates'

describe('toDateOnly / all-day exclusive end', () => {
  it('formats local date without timezone drift', () => {
    const d = new Date(2026, 9, 8, 12, 30) // Oct 8 2026 local
    expect(toDateOnly(d)).toBe('2026-10-08')
  })

  it('converts inclusive end to exclusive end', () => {
    expect(toExclusiveEndDate('2026-10-08')).toBe('2026-10-09')
  })

  it('converts exclusive end back to inclusive end', () => {
    expect(toInclusiveEndDate('2026-10-09')).toBe('2026-10-08')
  })

  it('handles month end and leap day', () => {
    expect(addDaysToDateString('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDaysToDateString('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDaysToDateString('2024-02-29', 1)).toBe('2024-03-01')
  })
})

describe('combineDateAndTime / splitDateTime round trip', () => {
  it('round-trips local date+time through UTC ISO', () => {
    const iso = combineDateAndTime('2026-10-08', '09:30')
    expect(splitDateTime(iso)).toEqual({ date: '2026-10-08', time: '09:30' })
  })
})

describe('eventOverlapsRange', () => {
  const iso = (y: number, m: number, d: number, h: number, min: number) =>
    new Date(y, m - 1, d, h, min).toISOString()
  const range = { start: new Date(2026, 9, 5), end: new Date(2026, 9, 12) }

  it('includes timed events fully inside the range', () => {
    expect(
      eventOverlapsRange(
        { all_day: false, start_at: iso(2026, 10, 6, 9, 0), end_at: iso(2026, 10, 6, 10, 0), start_date: null, end_date: null },
        range,
      ),
    ).toBe(true)
  })

  it('includes timed events crossing the range start', () => {
    expect(
      eventOverlapsRange(
        { all_day: false, start_at: iso(2026, 10, 4, 9, 0), end_at: iso(2026, 10, 6, 1, 0), start_date: null, end_date: null },
        range,
      ),
    ).toBe(true)
  })

  it('excludes timed events entirely before the range', () => {
    expect(
      eventOverlapsRange(
        { all_day: false, start_at: iso(2026, 10, 3, 9, 0), end_at: iso(2026, 10, 4, 9, 0), start_date: null, end_date: null },
        range,
      ),
    ).toBe(false)
  })

  it('excludes timed events starting exactly at exclusive end', () => {
    expect(
      eventOverlapsRange(
        { all_day: false, start_at: iso(2026, 10, 12, 0, 0), end_at: iso(2026, 10, 12, 1, 0), start_date: null, end_date: null },
        range,
      ),
    ).toBe(false)
  })

  it('includes all-day events and uses exclusive end correctly', () => {
    expect(
      eventOverlapsRange(
        { all_day: true, start_at: null, end_at: null, start_date: '2026-10-08', end_date: '2026-10-09' },
        range,
      ),
    ).toBe(true)
  })

  it('excludes all-day events touching the range start (exclusive)', () => {
    expect(
      eventOverlapsRange(
        { all_day: true, start_at: null, end_at: null, start_date: '2026-10-04', end_date: '2026-10-05' },
        range,
      ),
    ).toBe(false)
  })
})
