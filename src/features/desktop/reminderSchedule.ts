import { format } from 'date-fns'
import type { EventRow } from '../../types/database'
import type { EventReminders } from './eventReminders'

export interface ScheduledReminder { id: string; title: string; body: string; notify_at: number; start_at: number }

export function buildReminderSchedule(events: EventRow[], reminders: EventReminders, now = Date.now()): ScheduledReminder[] {
  return events.filter((event) => !event.deleted_at && Object.hasOwn(reminders, event.id)).flatMap((event) => {
    const leadMinutes = reminders[event.id]
    const start = new Date(event.all_day ? `${event.start_date}T09:00:00` : event.start_at!)
    const startAt = start.getTime()
    if (!Number.isFinite(startAt) || startAt + 60_000 < now) return []
    return [{
      id: `${event.id}:${startAt}`,
      title: event.title,
      body: `${format(start, 'M月d日 HH:mm')}${event.all_day ? ' · 全天日程' : ''}${event.description ? `\n${event.description.slice(0, 180)}` : ''}`,
      start_at: startAt,
      notify_at: startAt - leadMinutes * 60_000,
    }]
  })
}
