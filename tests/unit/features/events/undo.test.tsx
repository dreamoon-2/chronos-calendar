import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { demoBackend } from '../../../../src/services/demoBackend'
import { restoreEvent } from '../../../../src/features/events/eventsApi'
import { useEventUndo } from '../../../../src/features/events/useEventUndo'
import { ConflictError } from '../../../../src/utils/errors'

vi.mock('../../../../src/services/supabaseClient', () => ({ supabase: null }))
vi.mock('../../../../src/features/auth/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'demo-user' } }) }))
vi.mock('../../../../src/components/ui/Toast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))
vi.mock('../../../../src/features/events/eventQueries', () => ({ useInvalidateAll: () => vi.fn() }))
const create = () => demoBackend.createEvent({ title: '原始标题', description: '备注', category_id: null, all_day: false, start_at: '2026-10-09T09:00:00Z', end_at: '2026-10-09T10:00:00Z', start_date: null, end_date: null })
beforeEach(() => localStorage.clear())
describe('撤销与版本保护', () => {
  it('软删除后恢复同一条日程和全部原始内容', async () => {
    const before = create()
    const deleted = demoBackend.softDeleteEvent(before.id, before.version)
    const restored = await restoreEvent('demo-user', before, deleted.version)
    expect(restored.id).toBe(before.id)
    expect(restored.deleted_at).toBeNull()
    expect(restored.title).toBe(before.title)
    expect(restored.description).toBe(before.description)
    expect(restored.version).toBe(3)
  })
  it('另一设备已修改时拒绝撤销', async () => {
    const before = create()
    const after = demoBackend.updateEvent(before.id, before.version, { title: '本机修改' })
    demoBackend.updateEvent(before.id, after.version, { title: '其他设备的修改' })
    await expect(restoreEvent('demo-user', before, after.version)).rejects.toBeInstanceOf(ConflictError)
  })
  it('同一日程连续撤销正确推进版本', async () => {
    const { result } = renderHook(useEventUndo)
    const before = create()
    const middle = demoBackend.updateEvent(before.id, before.version, { title: '第一次修改' })
    const final = demoBackend.updateEvent(before.id, middle.version, { title: '第二次修改' })
    act(() => { result.current.remember(before, middle, '修改'); result.current.remember(middle, final, '修改') })
    await act(() => result.current.undo())
    await act(() => result.current.undo())
    const restored = demoBackend.listEvents({ start: new Date('2026-10-09'), end: new Date('2026-10-10') }).find((event) => event.id === before.id)
    expect(restored?.title).toBe('原始标题')
    expect(restored?.version).toBe(5)
    expect(result.current.latest).toBeNull()
  })
})
