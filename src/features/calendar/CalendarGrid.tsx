import { useCallback, useMemo, useRef, type RefObject, type CSSProperties } from 'react'
import Calendar, {
  type CalendarRef,
  type DateClickInfo,
  type DateSelectInfo,
  type DatesSetInfo,
  type EventClickInfo,
  type EventDisplayInfo,
  type EventDropInfo,
  type EventResizeDoneInfo,
  type DayHeaderInfo,
} from '@fullcalendar/react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import dayGridPlugin from '@fullcalendar/react/daygrid'
import timeGridPlugin from '@fullcalendar/react/timegrid'
import interactionPlugin from '@fullcalendar/react/interaction'
import themePlugin from '@fullcalendar/react/themes/classic'
import zhCn from '@fullcalendar/react/locales/zh-cn'
import type { CalendarEvent } from '../events/eventMappers'
import { CalendarEventCard } from './CalendarEventCard'
import { useCalendarGestures } from './useCalendarGestures'

import '@fullcalendar/react/skeleton.css'
import '@fullcalendar/react/themes/classic/theme.css'
import '@fullcalendar/react/themes/classic/palette.css'

interface CalendarGridProps {
  calendarRef: RefObject<CalendarRef>
  events: CalendarEvent[]
  zoom: number
  onChangeZoom: (zoom: number) => void
  onDatesSet: (info: DatesSetInfo) => void
  onSelect: (info: DateSelectInfo) => void
  onDateClick: (info: DateClickInfo) => void
  onEventClick: (info: EventClickInfo) => void
  onEventDrop: (info: EventDropInfo) => void
  onEventResize: (info: EventResizeDoneInfo) => void
}

// 模块级常量，保证引用稳定，避免 FullCalendar React 反复重渲染。
const VIEWS = {
  dayGridMonth: { dayRowClass: 'chronos-month-row' },
  timeGrid: { expandRows: false },
  timeGridThreeDay: { type: 'timeGrid', duration: { days: 3 } },
  dayGridThreeDay: { type: 'dayGrid', duration: { days: 3 } },
} as const

const PLUGINS = [themePlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]

const DAY_HEADER_FORMAT = { weekday: 'short' } as const
const TIME_FORMAT = { hour: '2-digit', minute: '2-digit', hour12: false } as const

export function CalendarGrid({
  calendarRef,
  events,
  zoom,
  onChangeZoom,
  onDatesSet,
  onSelect,
  onDateClick,
  onEventClick,
  onEventDrop,
  onEventResize,
}: CalendarGridProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const { pinching, ignoresInteraction } = useCalendarGestures(rootRef, calendarRef, zoom, onChangeZoom)
  const views = useMemo(() => VIEWS, [])
  const plugins = useMemo(() => PLUGINS, [])
  const locales = useMemo(() => [zhCn], [])
  const eventContent = useCallback(
    (info: EventDisplayInfo) => <CalendarEventCard info={info} />,
    [],
  )
  const dayCellClass = useCallback(
    (info: { isToday: boolean; view: { type: string } }) => `${info.isToday ? 'chronos-today' : ''} ${info.view.type === 'dayGridMonth' ? 'chronos-month-cell' : ''}`,
    [],
  )
  const dayHeaderClass = useCallback(
    (info: { isToday: boolean }) =>
      `chronos-day-header${info.isToday ? ' chronos-today-header' : ''}`,
    [],
  )
  const dayHeaderContent = useCallback((info: DayHeaderInfo) => (
    <div className="chronos-date-heading">
      <span className="chronos-weekday">{format(info.date, 'EEE', { locale: zhCN })}</span>
      {info.view.type.startsWith('timeGrid') && <span className="chronos-date-number">{format(info.date, 'M/d')}</span>}
    </div>
  ), [])

  return (
    <div ref={rootRef} className="chronos-calendar-surface h-full" style={{ '--calendar-zoom': zoom / 100 } as CSSProperties}>
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
      editable={!pinching}
      eventStartEditable
      eventDurationEditable
      selectable={!pinching}
      selectMirror
      select={(info) => { if (!ignoresInteraction()) onSelect(info) }}
      dateClick={(info) => { if (!ignoresInteraction()) onDateClick(info) }}
      eventClick={(info) => { if (!ignoresInteraction()) onEventClick(info) }}
      eventDrop={(info) => { if (ignoresInteraction()) info.revert(); else onEventDrop(info) }}
      eventResize={(info) => { if (ignoresInteraction()) info.revert(); else onEventResize(info) }}
      datesSet={onDatesSet}
      nowIndicator
      slotMinTime="00:00:00"
      slotMaxTime="24:00:00"
      slotDuration="01:00:00"
      slotMinHeight={64 * zoom / 100}
      snapDuration="00:15:00"
      scrollTime="08:00:00"
      allDaySlot
      slotEventOverlap={false}
      dayHeaderFormat={DAY_HEADER_FORMAT}
      dayCellClass={dayCellClass}
      dayHeaderClass={dayHeaderClass}
      dayHeaderContent={dayHeaderContent}
      eventTimeFormat={TIME_FORMAT}
      slotHeaderFormat={TIME_FORMAT}
      views={views}
    />
    </div>
  )
}
