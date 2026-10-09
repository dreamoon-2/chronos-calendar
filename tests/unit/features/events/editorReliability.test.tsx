import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EventEditor } from '../../../../src/features/events/EventEditor'
import { emptyForm } from '../../../../src/features/events/eventSchema'
import { draftKey, readDraft, writeDraft } from '../../../../src/features/events/eventDrafts'
import { ToastProvider } from '../../../../src/components/ui/Toast'

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), remove: vi.fn() }))
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
beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })
afterEach(cleanup)

describe('编辑可靠性', () => {
  it('保存失败保留表单、草稿与重试入口', async () => {
    mocks.create.mockRejectedValueOnce(new Error('保存失败')).mockResolvedValueOnce({})
    const user = userEvent.setup()
    const editor = renderEditor()
    await user.type(screen.getByLabelText(/标题/), '断网时的计划')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await screen.findByText('保存失败')
    expect(editor.close).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/标题/)).toHaveValue('断网时的计划')
    expect(readDraft(draftKey('test-user'))?.values.title).toBe('断网时的计划')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(editor.close).toHaveBeenCalledOnce())
    expect(readDraft(draftKey('test-user'))).toBeNull()
  })

  it('点击遮罩不关闭，重新打开恢复草稿，允许主动丢弃', async () => {
    const user = userEvent.setup()
    const editor = renderEditor()
    expect(screen.getByLabelText('备注')).not.toBeVisible()
    await user.type(screen.getByLabelText(/标题/), '未完成的输入')
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement!)
    expect(editor.close).not.toHaveBeenCalled()
    editor.unmount()
    renderEditor()
    expect(screen.getByLabelText(/标题/)).toHaveValue('未完成的输入')
    await user.click(screen.getByRole('button', { name: '丢弃草稿' }))
    expect(screen.getByLabelText(/标题/)).toHaveValue('')
    expect(readDraft(draftKey('test-user'))).toBeNull()
  })

  it('草稿按账号隔离，损坏或无效格式不会恢复', () => {
    writeDraft(draftKey('a'), { values: emptyForm({ title: 'A 的草稿' }) })
    expect(readDraft(draftKey('b'))).toBeNull()
    localStorage.setItem(draftKey('b'), '{')
    expect(readDraft(draftKey('b'))).toBeNull()
    localStorage.setItem(draftKey('b'), JSON.stringify({ values: { title: 42 } }))
    expect(readDraft(draftKey('b'))).toBeNull()
  })

  it('旧版本编辑草稿不能覆盖新版本，丢弃后可编辑最新内容', async () => {
    writeDraft(draftKey('test-user', 'event'), { values: emptyForm({ title: '旧草稿' }), version: 1 })
    render(<ToastProvider><EventEditor mode="edit" eventId="event" version={2} initial={emptyForm({ title: '其他设备更新的标题' })} categories={[]} categoriesReady onChanged={vi.fn()} onClose={vi.fn()} /></ToastProvider>)
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled()
    expect(screen.getByLabelText(/标题/)).toHaveValue('旧草稿')
    await userEvent.setup().click(screen.getByRole('button', { name: '丢弃草稿' }))
    expect(screen.getByRole('button', { name: '保存' })).toBeEnabled()
    expect(screen.getByLabelText(/标题/)).toHaveValue('其他设备更新的标题')
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
