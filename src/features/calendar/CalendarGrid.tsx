import { useCallback, useMemo, useRef, type RefObject, type CSSProperties } from 'react'
import Calendar, {
  type CalendarRef,
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
import multiMonthPlugin from '@fullcalendar/react/multimonth'
import interactionPlugin from '@fullcalendar/react/interaction'
import themePlugin from '@fullcalendar/react/themes/classic'
import zhCn from '@fullcalendar/react/locales/zh-cn'
import type { CalendarEvent } from '../events/eventMappers'
import { CalendarEventCard } from './CalendarEventCard'
import { useCalendarGestures } from './useCalendarGestures'
import { useCalendarSelection } from './useCalendarSelection'

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
  onEventClick: (info: EventClickInfo) => void
  onEventDrop: (info: EventDropInfo) => void
  onEventResize: (info: EventResizeDoneInfo) => void
}

// 模块级常量，保证引用稳定，避免 FullCalendar React 反复重渲染。
const VIEWS = {
  dayGridMonth: { dayRowClass: 'chronos-month-row' },
  timeGrid: { expandRows: false },
} as const

const PLUGINS = [themePlugin, dayGridPlugin, timeGridPlugin, multiMonthPlugin, interactionPlugin]

const DAY_HEADER_FORMAT = { weekday: 'short' } as const
const TIME_FORMAT = { hour: '2-digit', minute: '2-digit', hour12: false } as const

export function CalendarGrid({
  calendarRef,
  events,
  zoom,
  onChangeZoom,
  onDatesSet,
  onSelect,
  onEventClick,
  onEventDrop,
  onEventResize,
}: CalendarGridProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const { pinching, ignoresInteraction } = useCalendarGestures(rootRef, calendarRef, zoom, onChangeZoom)
  const selection = useCalendarSelection(calendarRef, onSelect, ignoresInteraction)
  const previousView = useRef('')
  const transition = useRef<Animation | null>(null)
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
    <div ref={rootRef} onPointerDownCapture={selection.onPointerDown} className="chronos-calendar-surface relative h-full" style={{ '--calendar-zoom': zoom / 100 } as CSSProperties}>
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
      selectMirror={false}
      selectMinDistance={4}
      unselectAuto={false}
      select={selection.onSelect}
      unselect={selection.onUnselect}
      dateClick={selection.onDateClick}
      eventClick={(info) => { if (!ignoresInteraction()) { selection.clear(); onEventClick(info) } }}
      eventDrop={(info) => { if (ignoresInteraction()) info.revert(); else onEventDrop(info) }}
      eventResize={(info) => { if (ignoresInteraction()) info.revert(); else onEventResize(info) }}
      datesSet={(info) => {
        selection.clear()
        if (previousView.current && previousView.current !== info.view.type && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          transition.current?.cancel()
          transition.current = rootRef.current?.animate([
            { opacity: 0.25 }, { opacity: 1 },
          ], { duration: 220, easing: 'ease-out' }) ?? null
        }
        previousView.current = info.view.type
        onDatesSet(info)
      }}
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
      multiMonthMaxColumns={3}
      singleMonthClass="chronos-year-month"
      singleMonthHeaderClass="chronos-year-month-heading"
      singleMonthMinWidth={Math.max(180, 280 * zoom / 100)}
    />
    {selection.selection && !pinching && <div role="status" className="chronos-selection-hint">
      已选中 {format(selection.selection.start, selection.selection.allDay ? 'M/d' : 'M/d HH:mm')}
      {selection.selection.allDay ? ' · 全天' : `–${format(selection.selection.end, 'HH:mm')}`} · 再次点击选中区域创建日程
    </div>}
    </div>
  )
}
