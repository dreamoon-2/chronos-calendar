import type { EventDisplayInfo } from '@fullcalendar/react'
import type { CSSProperties } from 'react'
import { eventPalette } from '../../lib/categories'

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
  }

  return (
    <div className="chronos-event-card" style={style}>
      {!event.allDay && isTimeGrid && timeText ? (
        <div className="chronos-event-time">{timeText}</div>
      ) : null}
      <div className="chronos-event-title">{event.title}</div>
    </div>
  )
}
