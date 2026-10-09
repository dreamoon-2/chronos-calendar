import { describe, expect, it } from 'vitest'
import { buildReminderSchedule } from '../../../../src/features/desktop/reminderSchedule'
import type { EventRow } from '../../../../src/types/database'
const event = { id: '1', title: '会议', description: '带资料', all_day: false, deleted_at: null, start_at: '2026-10-09T10:00:00Z' } as EventRow
describe('提醒时间', () => {
  it('提前提醒，排除已删除和已过期日程', () => {
    const plan = buildReminderSchedule([event, { ...event, id: '2', deleted_at: '2026-10-08' }], 10, new Date('2026-10-09T09:00:00Z').getTime())
    expect(plan).toHaveLength(1)
    expect(plan[0].notify_at).toBe(new Date('2026-10-09T09:50:00Z').getTime())
    expect(buildReminderSchedule([event], 10, new Date('2026-10-09T10:02:00Z').getTime())).toHaveLength(0)
  })
  it('全天日程以本地 09:00 为基准，修改备注不会产生重复提醒标识', () => {
    const allDay = { ...event, all_day: true, start_date: '2026-10-09', start_at: null }
    const now = new Date('2026-10-09T00:00:00').getTime()
    const first = buildReminderSchedule([allDay], 5, now)[0]
    expect(first.start_at).toBe(new Date('2026-10-09T09:00:00').getTime())
    expect(buildReminderSchedule([{ ...allDay, description: '修改备注' }], 5, now)[0].id).toBe(first.id)
  })
})
