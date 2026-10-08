import { beforeEach, describe, expect, it } from 'vitest'
import { demoBackend } from '../../src/lib/demoBackend'
import { ConflictError } from '../../src/lib/errors'
import type { EventInsert } from '../../src/types/database'

function timedInsert(title = '测试事件'): EventInsert {
  return {
    title,
    description: '',
    all_day: false,
    category_id: null,
    start_at: new Date(2030, 0, 2, 9, 0).toISOString(),
    end_at: new Date(2030, 0, 2, 10, 0).toISOString(),
    start_date: null,
    end_date: null,
  }
}

const range = { start: new Date(2030, 0, 1), end: new Date(2030, 0, 8) }

describe('demoBackend', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('soft delete removes the event from range queries', () => {
    const created = demoBackend.createEvent(timedInsert())
    expect(demoBackend.listEvents(range).some((e) => e.id === created.id)).toBe(true)

    demoBackend.softDeleteEvent(created.id, created.version)
    expect(demoBackend.listEvents(range).some((e) => e.id === created.id)).toBe(false)
  })

  it('rejects updates with a stale version (conflict)', () => {
    const created = demoBackend.createEvent(timedInsert())
    expect(() => demoBackend.updateEvent(created.id, 999, { title: '覆盖' })).toThrow(
      ConflictError,
    )
  })

  it('increments version on successful update', () => {
    const created = demoBackend.createEvent(timedInsert())
    const updated = demoBackend.updateEvent(created.id, created.version, { title: '新标题' })
    expect(updated.version).toBe(created.version + 1)
    expect(updated.title).toBe('新标题')
  })
})
