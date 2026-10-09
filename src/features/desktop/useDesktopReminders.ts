import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { addDays, startOfDay } from 'date-fns'
import { platform } from '../../platform/detectPlatform'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../auth/AuthProvider'
import { listEvents } from '../events/eventsApi'
import { buildReminderSchedule } from './reminderSchedule'
import { useDesktopPreferences } from './desktopPreferences'

export function useDesktopReminders() {
  const { user } = useAuth()
  const preferences = useDesktopPreferences(user?.id ?? '')
  const toast = useToast()
  const [day, setDay] = useState(() => startOfDay(new Date()))
  useEffect(() => {
    if (!platform.isTauri) return
    const timer = window.setInterval(() => {
      const next = startOfDay(new Date())
      setDay((previous) => previous.getTime() === next.getTime() ? previous : next)
    }, 60_000)
    return () => clearInterval(timer)
  }, [])
  const range = useMemo(() => ({ start: day, end: addDays(day, 3) }), [day])
  const enabled = platform.isTauri && preferences.reminders && !!user
  const events = useQuery({
    queryKey: ['events', 'reminders', user?.id, day.toISOString()],
    queryFn: () => listEvents(user!.id, range), enabled, refetchInterval: 60_000,
  })
  useEffect(() => {
    if (!platform.isTauri) return
    // 查询失败时保留已交给原生后台的提醒，避免短暂断网清空计划。
    if (enabled && !events.data) return
    void invoke('set_reminders', { userId: user?.id ?? '', reminders: enabled ? buildReminderSchedule(events.data ?? [], preferences.leadMinutes) : [] })
      .catch(() => toast.error('无法更新桌面提醒计划，请重启新版桌面程序'))
  }, [enabled, events.data, preferences.leadMinutes, user?.id, toast])
  useEffect(() => () => {
    if (platform.isTauri) void invoke('set_reminders', { userId: '', reminders: [] }).catch(() => undefined)
  }, [])
}
