import type { EventDisplayInfo } from '@fullcalendar/react'
import type { CSSProperties } from 'react'
import { format, subDays } from 'date-fns'
import { eventPalette } from '../../utils/colors'

/** 渲染单个日程卡片的内部内容：浅底、深字、左侧分类色条。 */
export function CalendarEventCard({ info }: { info: EventDisplayInfo }) {
  const { event } = info
  const props = event.extendedProps as {
    categoryColor?: string
    categoryName?: string | null
    taskId?: string | null
  }
  const palette = eventPalette(props.categoryColor ?? '#6a52ec')
  const isTimeGrid = info.view.type.startsWith('timeGrid')
  const isList = info.view.type.startsWith('list')

  const style: CSSProperties = {
    borderLeftColor: palette.accent,
    '--event-accent': palette.accent,
    '--event-background': palette.background,
    '--event-text': palette.text,
  } as CSSProperties
  const fullTime = event.allDay
    ? `${event.start?.toLocaleDateString('zh-CN') ?? ''} – ${event.end ? subDays(event.end, 1).toLocaleDateString('zh-CN') : ''} · 全天`
    : `${event.start?.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) ?? ''} – ${event.end?.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) ?? ''}`
  const tooltip = [event.title, fullTime, props.categoryName ?? '未分类', (event.extendedProps.description as string) || ''].filter(Boolean).join('\n')
  // 自己拼 HH:mm–HH:mm，避免 FullCalendar 的 timeText 在窄列里换行。
  const startTime = event.start ? format(event.start, 'HH:mm') : ''
  const endTime = event.end ? format(event.end, 'HH:mm') : ''
  const compactTime = startTime && endTime ? `${startTime}–${endTime}` : ''
  const listTime = event.allDay ? '全天' : compactTime

  return (
    <div
      className="chronos-event-card"
      data-timed={isTimeGrid && !event.allDay}
      data-list={isList}
      data-allday={event.allDay}
      data-task={Boolean(props.taskId)}
      style={style}
      title={tooltip}
      aria-label={tooltip}
    >
      {isList && listTime ? <span className="chronos-event-list-time">{listTime}</span> : null}
      <div className="chronos-event-title">{event.title}</div>
      {!isList && !event.allDay && isTimeGrid && compactTime ? (
        <div className="chronos-event-time">
          {startTime}
          <span className="chronos-event-time-range">–{endTime}</span>
        </div>
      ) : null}
    </div>
  )
}
