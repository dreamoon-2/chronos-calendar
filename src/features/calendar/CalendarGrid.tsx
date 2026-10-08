import { useCallback, useMemo, type RefObject } from 'react'
import Calendar, {
  type CalendarRef,
  type DateClickInfo,
  type DateSelectInfo,
  type DatesSetInfo,
  type EventClickInfo,
  type EventDisplayInfo,
  type EventDropInfo,
  type EventResizeDoneInfo,
} from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/react/daygrid'
import timeGridPlugin from '@fullcalendar/react/timegrid'
import interactionPlugin from '@fullcalendar/react/interaction'
import themePlugin from '@fullcalendar/react/themes/classic'
import zhCn from '@fullcalendar/react/locales/zh-cn'
import type { CalendarEvent } from '../events/eventMappers'
import { CalendarEventCard } from './CalendarEventCard'

import '@fullcalendar/react/skeleton.css'
import '@fullcalendar/react/themes/classic/theme.css'
import '@fullcalendar/react/themes/classic/palette.css'

interface CalendarGridProps {
  calendarRef: RefObject<CalendarRef>
  events: CalendarEvent[]
  onDatesSet: (info: DatesSetInfo) => void
  onSelect: (info: DateSelectInfo) => void
  onDateClick: (info: DateClickInfo) => void
  onEventClick: (info: EventClickInfo) => void
  onEventDrop: (info: EventDropInfo) => void
  onEventResize: (info: EventResizeDoneInfo) => void
}

// 模块级常量，保证引用稳定，避免 FullCalendar React 反复重渲染。
const VIEWS = {
  timeGridThreeDay: { type: 'timeGrid', duration: { days: 3 } },
  dayGridThreeDay: { type: 'dayGrid', duration: { days: 3 } },
} as const

const PLUGINS = [themePlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]

const DAY_HEADER_FORMAT = { weekday: 'short' } as const
const TIME_FORMAT = { hour: '2-digit', minute: '2-digit', hour12: false } as const

export function CalendarGrid({
  calendarRef,
  events,
  onDatesSet,
  onSelect,
  onDateClick,
  onEventClick,
  onEventDrop,
  onEventResize,
}: CalendarGridProps) {
  const views = useMemo(() => VIEWS, [])
  const plugins = useMemo(() => PLUGINS, [])
  const locales = useMemo(() => [zhCn], [])
  const eventContent = useCallback(
    (info: EventDisplayInfo) => <CalendarEventCard info={info} />,
    [],
  )
  const dayCellClass = useCallback(
    (info: { isToday: boolean }) => (info.isToday ? 'chronos-today' : ''),
    [],
  )
  const dayHeaderClass = useCallback(
    (info: { isToday: boolean }) =>
      `chronos-day-header${info.isToday ? ' chronos-today-header' : ''}`,
    [],
  )

  return (
    <Calendar
      ref={calendarRef}
      plugins={plugins}
      initialView="timeGridWeek"
      locale="zh-cn"
      locales={locales}
      firstDay={1}
      headerToolbar={false}
      footerToolbar={false}
      height="100%"
      expandRows
      dayMaxEvents
      events={events}
      eventClass="chronos-event"
      eventContent={eventContent}
      editable
      eventStartEditable
      eventDurationEditable
      selectable
      selectMirror
      select={onSelect}
      dateClick={onDateClick}
      eventClick={onEventClick}
      eventDrop={onEventDrop}
      eventResize={onEventResize}
      datesSet={onDatesSet}
      nowIndicator
      slotMinTime="00:00:00"
      slotMaxTime="24:00:00"
      slotDuration="01:00:00"
      scrollTime="08:00:00"
      allDaySlot
      slotEventOverlap={false}
      dayHeaderFormat={DAY_HEADER_FORMAT}
      dayCellClass={dayCellClass}
      dayHeaderClass={dayHeaderClass}
      eventTimeFormat={TIME_FORMAT}
      slotHeaderFormat={TIME_FORMAT}
      views={views}
    />
  )
}
