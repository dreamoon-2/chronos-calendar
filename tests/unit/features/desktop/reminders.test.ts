import { describe, expect, it } from 'vitest'
import { buildReminderSchedule } from '../../../../src/features/desktop/reminderSchedule'
import type { EventRow } from '../../../../src/types/database'
const event = { id: '1', title: '会议', description: '带资料', all_day: false, deleted_at: null, start_at: '2026-10-09T10:00:00Z' } as EventRow
describe('提醒时间', () => {
  it('提前提醒，排除已删除和已过期日程', () => {
    const plan = buildReminderSchedule([event, { ...event, id: '2', deleted_at: '2026-10-08' }], { '1': 10, '2': 5 }, new Date('2026-10-09T09:00:00Z').getTime())
    expect(plan).toHaveLength(1)
    expect(plan[0].notify_at).toBe(new Date('2026-10-09T09:50:00Z').getTime())
    expect(buildReminderSchedule([event], { '1': 10 }, new Date('2026-10-09T10:02:00Z').getTime())).toHaveLength(0)
  })
  it('全天日程以本地 09:00 为基准，修改备注不会产生重复提醒标识', () => {
    const allDay = { ...event, all_day: true, start_date: '2026-10-09', start_at: null }
    const now = new Date('2026-10-09T00:00:00').getTime()
    const first = buildReminderSchedule([allDay], { '1': 5 }, now)[0]
    expect(first.start_at).toBe(new Date('2026-10-09T09:00:00').getTime())
    expect(buildReminderSchedule([{ ...allDay, description: '修改备注' }], { '1': 5 }, now)[0].id).toBe(first.id)
  })
  it('只提醒单独勾选的日程，开始时提醒的 0 不被当作关闭', () => {
    const now = new Date('2026-10-09T09:00:00Z').getTime()
    expect(buildReminderSchedule([event], {}, now)).toEqual([])
    const plans = buildReminderSchedule([event, { ...event, id: '2' }, { ...event, id: '3' }], { '1': 0, '2': 30 }, now)
    expect(plans).toHaveLength(2)
    expect(plans[0].notify_at).toBe(plans[0].start_at)
    expect(plans[1].start_at - plans[1].notify_at).toBe(30 * 60_000)
  })
})
