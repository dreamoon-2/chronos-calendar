import { beforeEach, expect, it, vi } from 'vitest'
import { checkForUpdate } from '../../../../src/features/updates/updateService'

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), check: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke }))
vi.mock('@tauri-apps/plugin-updater', () => ({ check: mocks.check }))

beforeEach(() => vi.resetAllMocks())

it.each(['unpublished', 'incomplete'])('发布状态为 %s 时不请求不存在的更新清单', async (status) => {
  mocks.invoke.mockResolvedValue(status)
  expect(await checkForUpdate()).toEqual({ status })
  expect(mocks.invoke).toHaveBeenCalledWith('github_release_status')
  expect(mocks.check).not.toHaveBeenCalled()
})

it('正式发布已准备好时交给原生更新器比较版本，保留下载资源', async () => {
  const update = { version: '0.3.1', body: '版本说明' }
  mocks.invoke.mockResolvedValue('ready')
  mocks.check.mockResolvedValue(update)
  expect(await checkForUpdate()).toEqual({ status: 'available', update })
  expect(mocks.check).toHaveBeenCalledWith({ timeout: 15_000 })
})

it('原生更新器未发现更高版本时显示最新版本', async () => {
  mocks.invoke.mockResolvedValue('ready')
  mocks.check.mockResolvedValue(null)
  expect(await checkForUpdate()).toEqual({ status: 'latest' })
})

it('API 或更新清单请求失败时保留错误，避免误报最新版本', async () => {
  mocks.invoke.mockRejectedValueOnce(new Error('GitHub 连接失败'))
  await expect(checkForUpdate()).rejects.toThrow('GitHub 连接失败')
  expect(mocks.check).not.toHaveBeenCalled()
  mocks.invoke.mockResolvedValue('ready')
  mocks.check.mockRejectedValueOnce(new Error('updater endpoint unreachable'))
  await expect(checkForUpdate()).rejects.toThrow('updater endpoint unreachable')
})
