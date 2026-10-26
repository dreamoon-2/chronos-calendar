import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EventEditor } from '../../../../src/features/events/EventEditor'
import { emptyForm } from '../../../../src/features/events/eventSchema'
import { ToastProvider } from '../../../../src/components/ui/Toast'
import type { EventRow } from '../../../../src/types/database'

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

const taskEvent = (): EventRow => ({
  id: 'event-1',
  user_id: 'test-user',
  category_id: null,
  task_id: 'task-1',
  title: '写周报',
  description: '',
  all_day: false,
  start_at: '2026-10-26T01:00:00.000Z',
  end_at: '2026-10-26T02:00:00.000Z',
  start_date: null,
  end_date: null,
  deleted_at: null,
  version: 2,
  created_at: '',
  updated_at: '',
})

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  mocks.permission.mockResolvedValue(undefined)
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('编辑可靠性', () => {
  it('保存失败保留表单，重试成功后关闭，且不写入草稿', async () => {
    mocks.create.mockRejectedValueOnce(new Error('保存失败')).mockResolvedValueOnce({})
    const user = userEvent.setup()
    const editor = renderEditor()
    await user.type(screen.getByLabelText(/标题/), '断网时的计划')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await screen.findByText('保存失败')
    expect(editor.close).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/标题/)).toHaveValue('断网时的计划')
    expect(Object.keys(localStorage).some((key) => key.startsWith('chronos.draft'))).toBe(false)
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(editor.close).toHaveBeenCalledOnce())
    expect(Object.keys(localStorage).some((key) => key.startsWith('chronos.draft'))).toBe(false)
  })

  it('点击遮罩不关闭；关闭未保存内容时只能继续编辑或放弃', async () => {
    const user = userEvent.setup()
    const editor = renderEditor()
    expect(screen.getByLabelText('备注')).not.toBeVisible()
    await user.type(screen.getByLabelText(/标题/), '未完成的输入')
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement!)
    expect(editor.close).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '关闭' }))
    expect(screen.getByText('还有未保存的内容，确定要关闭吗？')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '继续编辑' }))
    expect(screen.getByLabelText(/标题/)).toHaveValue('未完成的输入')
    await user.click(screen.getByRole('button', { name: '关闭' }))
    await user.click(screen.getByRole('button', { name: '放弃修改并关闭' }))
    expect(editor.close).toHaveBeenCalledOnce()
    expect(Object.keys(localStorage).some((key) => key.startsWith('chronos.draft'))).toBe(false)
  })

  it('没有修改时直接关闭，不弹出确认', async () => {
    const editor = renderEditor()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '关闭' }))
    expect(editor.close).toHaveBeenCalledOnce()
    expect(screen.queryByText('还有未保存的内容，确定要关闭吗？')).not.toBeInTheDocument()
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

  it('由待办生成的日程可移回待办清单', async () => {
    const unschedule = vi.fn().mockResolvedValue(undefined)
    const close = vi.fn()
    const original = taskEvent()
    render(
      <ToastProvider>
        <EventEditor
          mode="edit"
          eventId={original.id}
          version={original.version}
          initial={emptyForm({ title: original.title, startDate: '2026-10-26', startTime: '09:00', endTime: '10:00' })}
          categories={[]}
          categoriesReady
          original={original}
          onChanged={vi.fn()}
          onUnschedule={unschedule}
          onClose={close}
        />
      </ToastProvider>,
    )
    const button = screen.getByRole('button', { name: '移回待办清单' })
    await userEvent.setup().click(button)
    expect(unschedule).toHaveBeenCalledWith(original)
    await waitFor(() => expect(close).toHaveBeenCalledOnce())
  })
})
