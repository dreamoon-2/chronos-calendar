import type { EventDisplayInfo } from '@fullcalendar/react'
import type { CSSProperties } from 'react'
import { subDays } from 'date-fns'
import { eventPalette } from '../../utils/colors'

/** 渲染单个日程卡片的内部内容：浅底、深字、左侧分类色条。 */
export function CalendarEventCard({ info }: { info: EventDisplayInfo }) {
  const { event, timeText } = info
  const props = event.extendedProps as {
    categoryColor?: string
    categoryName?: string | null
  }
  const palette = eventPalette(props.categoryColor ?? '#6a52ec')
  const isTimeGrid = info.view.type.startsWith('timeGrid')

  const style: CSSProperties = {
    borderLeftColor: palette.accent,
    '--event-accent': palette.accent,
    '--event-background': palette.background,
    '--event-text': palette.text,
  } as CSSProperties
  const time = event.allDay
    ? `${event.start?.toLocaleDateString('zh-CN') ?? ''} – ${event.end ? subDays(event.end, 1).toLocaleDateString('zh-CN') : ''} · 全天`
    : `${event.start?.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) ?? ''} – ${event.end?.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) ?? ''}`
  const tooltip = [event.title, time, props.categoryName ?? '未分类', (event.extendedProps.description as string) || ''].filter(Boolean).join('\n')

  return (
    <div className="chronos-event-card" data-timed={isTimeGrid && !event.allDay} style={style} title={tooltip} aria-label={tooltip}>
      <div className="chronos-event-title">{event.title}</div>
      {!event.allDay && isTimeGrid && timeText ? (
        <div className="chronos-event-time">{timeText}</div>
      ) : null}
    </div>
  )
}
