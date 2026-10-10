import { useSyncExternalStore } from 'react'
import { isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification'
import { platform } from '../../platform/detectPlatform'

/** 系统通知属于当前设备，按账号及日程 ID 隔离；未选择的日程不提醒。 */
export type EventReminders = Record<string, number>
const key = (userId: string) => `chronos.event-reminders.${userId}`
const cache = new Map<string, EventReminders>()
const listeners = new Set<() => void>()
export function getEventReminders(userId: string): EventReminders {
  if (cache.has(userId)) return cache.get(userId)!
  let value: EventReminders = {}
  try {
    const saved = JSON.parse(localStorage.getItem(key(userId)) ?? '{}')
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) value = Object.fromEntries(
      Object.entries(saved).filter(([, minutes]) => typeof minutes === 'number' && [0, 5, 10, 15, 30].includes(minutes)),
    ) as EventReminders
  } catch { /* 默认不提醒，也不沿用旧版全局提醒。 */ }
  cache.set(userId, value)
  return value
}
export function setEventReminder(userId: string, eventId: string, minutes: number | null) {
  if (minutes !== null && ![0, 5, 10, 15, 30].includes(minutes)) throw new Error('提醒时间无效')
  const value = { ...getEventReminders(userId) }
  if (minutes === null) delete value[eventId]
  else value[eventId] = minutes
  localStorage.setItem(key(userId), JSON.stringify(value))
  cache.set(userId, value)
  listeners.forEach(listener => listener())
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export function useEventReminders(userId: string) {
  return useSyncExternalStore(subscribe, () => getEventReminders(userId))
}
export async function ensureNotificationPermission() {
  if (platform.isTauri && !await isPermissionGranted() && await requestPermission() !== 'granted') {
    throw new Error('系统未允许通知，请在 Windows 通知设置中开启 Chronos，或关闭本条日程的提醒后保存')
  }
}
