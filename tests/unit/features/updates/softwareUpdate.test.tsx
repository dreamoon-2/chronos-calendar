import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { DownloadEvent, Update } from '@tauri-apps/plugin-updater'
import { SoftwareUpdateProvider } from '../../../../src/features/updates/SoftwareUpdateProvider'
import { SoftwareUpdateSettings } from '../../../../src/features/updates/SoftwareUpdateSettings'

const mocks = vi.hoisted(() => ({ check: vi.fn(), relaunch: vi.fn(), platform: { isTauri: true } }))
vi.mock('../../../../src/platform/detectPlatform', () => ({ platform: mocks.platform }))
vi.mock('../../../../src/features/updates/updateService', async (original) => ({ ...await original<typeof import('../../../../src/features/updates/updateService')>(), checkForUpdate: mocks.check }))
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: mocks.relaunch }))

function release() {
  return {
    version: '0.3.1', body: '改进提醒与日历体验', close: vi.fn().mockResolvedValue(undefined),
    download: vi.fn(async (onEvent?: (event: DownloadEvent) => void) => {
      onEvent?.({ event: 'Started', data: { contentLength: 100 } })
      onEvent?.({ event: 'Progress', data: { chunkLength: 100 } })
      onEvent?.({ event: 'Finished' })
    }),
    install: vi.fn().mockResolvedValue(undefined),
  }
}
function show() {
  return render(<SoftwareUpdateProvider><SoftwareUpdateSettings /></SoftwareUpdateProvider>)
}
const panel = () => within(screen.getByRole('heading', { name: '软件更新' }).parentElement!)
async function check() { await userEvent.setup().click(panel().getByRole('button', { name: '检查更新' })) }

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('chronos.updater.auto', 'false')
  vi.clearAllMocks()
  mocks.platform.isTauri = true
  mocks.check.mockResolvedValue({ status: 'latest' })
  mocks.relaunch.mockResolvedValue(undefined)
})
afterEach(() => { cleanup(); vi.useRealTimers() })

it('启动检查不阻塞页面，StrictMode 只检查一次，可记住关闭偏好', async () => {
  vi.useFakeTimers()
  localStorage.removeItem('chronos.updater.auto')
  render(<StrictMode><SoftwareUpdateProvider><SoftwareUpdateSettings /></SoftwareUpdateProvider></StrictMode>)
  expect(mocks.check).not.toHaveBeenCalled()
  await act(() => vi.advanceTimersByTimeAsync(1200))
  expect(mocks.check).toHaveBeenCalledOnce()
  expect(panel().getByText('当前已是最新发布版本')).toBeVisible()
  fireEvent.click(panel().getByRole('checkbox', { name: '启动时检查更新' }))
  expect(localStorage.getItem('chronos.updater.auto')).toBe('false')
})

it('尚无 Release 与检查失败不误报为最新版本，并可重试', async () => {
  mocks.check.mockResolvedValueOnce({ status: 'unpublished' }).mockRejectedValueOnce(new Error('network offline')).mockResolvedValueOnce({ status: 'latest' })
  show()
  await check()
  expect(panel().getByText('目前尚未发布可自动更新的版本')).toBeVisible()
  await check()
  expect(panel().getByText('暂时无法检查更新，请检查网络后重试。')).toBeVisible()
  await check()
  expect(panel().getByText('当前已是最新发布版本')).toBeVisible()
})

it('签名校验失败不安装，允许重新下载并完成更新', async () => {
  const update = release()
  update.download.mockRejectedValueOnce(new Error('signature verification failed'))
  mocks.check.mockResolvedValue({ status: 'available', update: update as unknown as Update })
  show(); await check()
  await userEvent.setup().click(panel().getByRole('button', { name: '下载并更新' }))
  expect(panel().getByText('更新包签名校验失败，已停止更新，请稍后重试。')).toBeVisible()
  expect(update.install).not.toHaveBeenCalled()
  expect(mocks.relaunch).not.toHaveBeenCalled()
  await userEvent.setup().click(panel().getByRole('button', { name: '重试更新' }))
  await waitFor(() => expect(update.install).toHaveBeenCalledOnce())
  expect(mocks.relaunch).toHaveBeenCalledOnce()
})

it('下载进度清晰，下载期间重复操作不会发起第二次更新', async () => {
  const update = release()
  let finish!: () => void
  update.download.mockImplementationOnce(async (callback) => {
    callback?.({ event: 'Started', data: { contentLength: 100 } })
    callback?.({ event: 'Progress', data: { chunkLength: 40 } })
    await new Promise<void>((resolve) => { finish = resolve })
  })
  mocks.check.mockResolvedValue({ status: 'available', update: update as unknown as Update })
  show(); await check()
  const button = panel().getByRole('button', { name: '下载并更新' })
  await userEvent.setup().click(button)
  expect(button).toBeDisabled()
  expect(panel().getByRole('progressbar')).toHaveAttribute('value', '40')
  expect(panel().getByText('正在下载 40%')).toBeVisible()
  fireEvent.click(button)
  expect(update.download).toHaveBeenCalledOnce()
  await act(async () => finish())
  expect(update.install).toHaveBeenCalledOnce()
})

it('保护正在编辑的日程，关闭编辑器后才允许更新', async () => {
  const update = release()
  mocks.check.mockResolvedValue({ status: 'available', update: update as unknown as Update })
  show(); await check()
  const editor = document.createElement('div')
  editor.setAttribute('role', 'dialog'); editor.setAttribute('aria-label', '新建日程'); document.body.append(editor)
  await userEvent.setup().click(panel().getByRole('button', { name: '下载并更新' }))
  expect(update.download).not.toHaveBeenCalled()
  expect(screen.getByRole('alert')).toHaveTextContent('请先保存或关闭正在编辑的日程')
  editor.remove()
  await userEvent.setup().click(panel().getByRole('button', { name: '下载并更新' }))
  await waitFor(() => expect(update.install).toHaveBeenCalledOnce())
})

it('浏览器与手机容器不执行桌面更新', async () => {
  vi.useFakeTimers(); mocks.platform.isTauri = false
  localStorage.removeItem('chronos.updater.auto')
  show()
  await act(() => vi.advanceTimersByTimeAsync(1500))
  expect(mocks.check).not.toHaveBeenCalled()
  expect(screen.queryByRole('heading', { name: '软件更新' })).not.toBeInTheDocument()
})
