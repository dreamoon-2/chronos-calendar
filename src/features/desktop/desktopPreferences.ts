import { useSyncExternalStore } from 'react'

export interface DesktopPreferences { reminders: boolean; leadMinutes: number }
const listeners = new Set<() => void>()
const cache = new Map<string, DesktopPreferences>()
const defaults: DesktopPreferences = { reminders: false, leadMinutes: 10 }
const key = (userId: string) => `chronos.desktop.${userId}`

export function getDesktopPreferences(userId: string): DesktopPreferences {
  const cached = cache.get(userId)
  if (cached) return cached
  let value = defaults
  try {
    const saved = JSON.parse(localStorage.getItem(key(userId)) ?? 'null')
    if (saved) value = { reminders: saved.reminders === true, leadMinutes: [0, 5, 10, 15, 30].includes(saved.leadMinutes) ? saved.leadMinutes : 10 }
  } catch { /* 默认不开启提醒。 */ }
  cache.set(userId, value)
  return value
}

export function setDesktopPreferences(userId: string, patch: Partial<DesktopPreferences>) {
  const value = { ...getDesktopPreferences(userId), ...patch }
  localStorage.setItem(key(userId), JSON.stringify(value))
  cache.set(userId, value)
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export function useDesktopPreferences(userId: string) {
  return useSyncExternalStore(subscribe, () => getDesktopPreferences(userId))
}
