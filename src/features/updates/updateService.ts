import { invoke } from '@tauri-apps/api/core'
import { check, type Update } from '@tauri-apps/plugin-updater'

export const RELEASES_URL = 'https://github.com/dreamoon-2/chronos-calendar/releases'
export type ReleaseStatus = 'ready' | 'unpublished' | 'incomplete'
export type UpdateResult = { status: 'available'; update: Update } | { status: 'latest' | 'unpublished' | 'incomplete' }

export async function checkForUpdate(): Promise<UpdateResult> {
  const status = await invoke<ReleaseStatus>('github_release_status')
  if (status !== 'ready') return { status }
  const update = await check({ timeout: 15_000 })
  return update ? { status: 'available', update } : { status: 'latest' }
}

export function updateErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/signature|minisign|pubkey/i.test(message)) return '更新包签名校验失败，已停止更新，请稍后重试。'
  if (/^(无法|GitHub|版本信息)/.test(message)) return message.slice(0, 160)
  return fallback
}
