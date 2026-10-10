import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EventEditor } from '../../../../src/features/events/EventEditor'
import { emptyForm } from '../../../../src/features/events/eventSchema'
import { deleteDraft, listDrafts, saveDraft } from '../../../../src/features/events/eventDrafts'
import { ToastProvider } from '../../../../src/components/ui/Toast'

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), remove: vi.fn(), permission: vi.fn() }))
vi.mock('../../../../src/features/desktop/eventReminders', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../../src/features/desktop/eventReminders')>(),
  ensureNotificationPermission: mocks.permission,
}))
vi.mock('../../../../src/features/auth/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'test-user' } }) }))
vi.mock('../../../../src/features/events/eventQueries', () => ({
  useCreateEvent: () => ({ mutateAsync: mocks.create, isPending: false }),
  useUpdateEvent: () => ({ mutateAsync: mocks.update, isPending: false }),
  useSoftDeleteEvent: () => ({ mutateAsync: mocks.remove, isPending: false }),
}))
vi.mock('../../../../src/features/categories/categoryQueries', () => ({ useCreateCategory: () => ({ mutateAsync: vi.fn(), isPending: false }) }))

const renderEditor = (close = vi.fn()) => {
  const result = render(<ToastProvider><EventEditor mode="create" initial={emptyForm()} categories={[]} categoriesReady onChanged={vi.fn()} onClose={close} /></ToastProvider>)
  return { ...result, close }
}
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); mocks.permission.mockResolvedValue(undefined) })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('编辑可靠性', () => {
  it('保存失败保留表单，只在主动保存时生成草稿，重试成功后关闭', async () => {
    mocks.create.mockRejectedValueOnce(new Error('保存失败')).mockResolvedValueOnce({})
    const user = userEvent.setup()
    const editor = renderEditor()
    await user.type(screen.getByLabelText(/标题/), '断网时的计划')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await screen.findByText('保存失败')
    expect(editor.close).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/标题/)).toHaveValue('断网时的计划')
    expect(listDrafts('test-user')).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: '保存草稿' }))
    expect(listDrafts('test-user')[0].values.title).toBe('断网时的计划')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(editor.close).toHaveBeenCalledOnce())
    expect(listDrafts('test-user')).toHaveLength(0)
  })

  it('遮罩不关闭，关闭时自行选择保存，重新新建不会自动恢复草稿', async () => {
    const user = userEvent.setup()
    const editor = renderEditor()
    expect(screen.getByLabelText('备注')).not.toBeVisible()
    await user.type(screen.getByLabelText(/标题/), '未完成的输入')
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement!)
    expect(editor.close).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '关闭' }))
    expect(screen.getByText('还有未保存的内容，要保存为草稿吗？')).toBeVisible()
    expect(listDrafts('test-user')).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: '保存草稿并关闭' }))
    expect(editor.close).toHaveBeenCalledOnce()
    editor.unmount()
    renderEditor()
    expect(screen.getByLabelText(/标题/)).toHaveValue('')
    expect(listDrafts('test-user')[0].values.title).toBe('未完成的输入')
  })

  it('草稿按账号隔离，损坏或无效格式不会恢复', () => {
    saveDraft('a', emptyForm({ title: 'A 的草稿' }))
    expect(listDrafts('b')).toEqual([])
    localStorage.setItem('chronos.drafts.b', '{')
    expect(listDrafts('b')).toEqual([])
    localStorage.setItem('chronos.drafts.b', JSON.stringify([{ values: { title: 42 } }]))
    expect(listDrafts('b')).toEqual([])
  })

  it('旧版自动草稿保留在列表中，但不覆盖最新日程编辑内容', () => {
    localStorage.setItem('chronos.draft.test-user.event', JSON.stringify({ values: emptyForm({ title: '旧草稿' }), version: 1 }))
    render(<ToastProvider><EventEditor mode="edit" eventId="event" version={2} initial={emptyForm({ title: '其他设备更新的标题' })} categories={[]} categoriesReady onChanged={vi.fn()} onClose={vi.fn()} /></ToastProvider>)
    expect(screen.getByRole('button', { name: '保存' })).toBeEnabled()
    expect(screen.getByLabelText(/标题/)).toHaveValue('其他设备更新的标题')
    expect(listDrafts('test-user')[0].values.title).toBe('旧草稿')
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it('多份草稿可分别更新和删除，旧草稿可迁移后继续保存', () => {
    const a = saveDraft('a', emptyForm({ title: '草稿 A' }))
    const b = saveDraft('a', emptyForm({ title: '草稿 B' }))
    saveDraft('a', emptyForm({ title: '草稿 A 修改' }), a.id)
    expect(listDrafts('a')).toHaveLength(2)
    deleteDraft('a', b.id)
    expect(listDrafts('a')[0].values.title).toBe('草稿 A 修改')
    const oldId = 'chronos.draft.a.new'
    localStorage.setItem(oldId, JSON.stringify({ values: emptyForm({ title: '旧草稿' }) }))
    const migrated = saveDraft('a', emptyForm({ title: '旧草稿修改' }), oldId)
    expect(migrated.id).not.toBe(oldId)
    expect(localStorage.getItem(oldId)).toBeNull()
    expect(listDrafts('a')).toHaveLength(2)
  })
  it('选择不保存关闭不会留下草稿', async () => {
    const editor = renderEditor()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/标题/), '不保留的输入')
    await user.click(screen.getByRole('button', { name: '关闭' }))
    await user.click(screen.getByRole('button', { name: '不保存并关闭' }))
    expect(editor.close).toHaveBeenCalledOnce()
    expect(listDrafts('test-user')).toEqual([])
  })
  it('草稿存储失败时保持编辑器，避免误丢输入', async () => {
    const editor = renderEditor()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/标题/), '需要保留的输入')
    await user.click(screen.getByRole('button', { name: '关闭' }))
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    await user.click(screen.getByRole('button', { name: '保存草稿并关闭' }))
    expect(editor.close).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/标题/)).toHaveValue('需要保留的输入')
    await screen.findByText('草稿保存失败，请保留表单并重试')
  })
  it('未获通知权限时保留表单，不创建日程，用户可关闭提醒后重试', async () => {
    mocks.permission.mockRejectedValueOnce(new Error('通知未授权'))
    mocks.create.mockResolvedValueOnce({ id: 'permission-retry' })
    const editor = renderEditor()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/标题/), '带提醒的计划')
    await user.click(screen.getByRole('checkbox', { name: '此日程系统提醒' }))
    await user.click(screen.getByRole('button', { name: '保存' }))
    await screen.findByText('通知未授权')
    expect(mocks.create).not.toHaveBeenCalled()
    expect(editor.close).not.toHaveBeenCalled()
    await user.click(screen.getByRole('checkbox', { name: '此日程系统提醒' }))
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(editor.close).toHaveBeenCalledOnce())
  })
})
