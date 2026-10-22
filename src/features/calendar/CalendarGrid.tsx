import { useCallback, useEffect, useMemo, useRef, useState, type RefObject, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import Calendar, {
  type CalendarRef,
  type DateSelectInfo,
  type DatesSetInfo,
  type EventApi,
  type EventClickInfo,
  type EventDisplayInfo,
  type EventDropInfo,
  type EventReceiveInfo,
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
import { SelectionOverlay } from './SelectionOverlay'
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
  onTaskDrop: (info: EventReceiveInfo) => void
  selectedEventId?: string | null
  onSelectEvent?: (id: string) => void
  onUnscheduleEvent?: (event: EventApi) => void
  /** 移动端点击日历空白处时收起待办抽屉。 */
  onSurfacePointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void
}

// 模块级常量，保证引用稳定，避免 FullCalendar React 反复重渲染。
const VIEWS = {
  dayGridMonth: { dayRowClass: 'chronos-month-row' },
  timeGrid: { expandRows: false },
} as const

const PLUGINS = [themePlugin, dayGridPlugin, timeGridPlugin, multiMonthPlugin, interactionPlugin]

const DAY_HEADER_FORMAT = { weekday: 'short' } as const
const TIME_FORMAT = { hour: '2-digit', minute: '2-digit', hour12: false } as const

const VIEW_RANK: Record<string, number> = {
  multiMonthYear: 0,
  dayGridMonth: 1,
  timeGridWeek: 2,
  timeGridDay: 3,
}

function isOverTaskDropzone(point: { clientX: number; clientY: number }): boolean {
  if (!Number.isFinite(point.clientX) || !Number.isFinite(point.clientY)) return false
  return document.elementsFromPoint(point.clientX, point.clientY)
    .some((element) => element.closest('[data-task-dropzone]') !== null)
}

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
  onTaskDrop,
  selectedEventId = null,
  onSelectEvent,
  onUnscheduleEvent,
  onSurfacePointerDown,
}: CalendarGridProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const { pinching, ignoresInteraction } = useCalendarGestures(rootRef, calendarRef, zoom, onChangeZoom)
  const selection = useCalendarSelection(calendarRef, onSelect, ignoresInteraction)
  const [draggingTaskEventId, setDraggingTaskEventId] = useState<string | null>(null)
  const dropOnTaskRef = useRef<string | null>(null)
  const dragPoint = useRef<{ clientX: number; clientY: number } | null>(null)
  const dragTrackingCleanup = useRef<(() => void) | null>(null)
  const previousFrame = useRef<{ type: string; start: number } | null>(null)
  const transition = useRef<Animation | null>(null)
  // 拖动期间不更新 FullCalendar 内部事件属性，避免打断拖拽；松手后再补上选中样式。
  // 延后到宏任务，避免在 React 生命周期内触发 FullCalendar 的 flushSync。
  useEffect(() => {
    if (draggingTaskEventId) return
    const timer = window.setTimeout(() => {
      const api = calendarRef.current?.getApi()
      if (!api) return
      for (const event of api.getEvents()) {
        const selected = event.id === selectedEventId
        if (Boolean(event.extendedProps.selected) !== selected) {
          event.setExtendedProp('selected', selected)
        }
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [calendarRef, selectedEventId, draggingTaskEventId, events])

  useEffect(() => () => dragTrackingCleanup.current?.(), [])

  const startDragTracking = (start: { clientX: number; clientY: number }) => {
    dragTrackingCleanup.current?.()
    dragPoint.current = start
    const track = (event: Event) => {
      if ('touches' in event) {
        const touchEvent = event as TouchEvent
        const touch = touchEvent.touches[0] ?? touchEvent.changedTouches[0]
        if (touch) dragPoint.current = { clientX: touch.clientX, clientY: touch.clientY }
      } else if ('clientX' in event && 'clientY' in event) {
        dragPoint.current = {
          clientX: (event as MouseEvent).clientX,
          clientY: (event as MouseEvent).clientY,
        }
      }
    }
    const cleanup = () => {
      window.removeEventListener('pointermove', track, true)
      window.removeEventListener('touchmove', track, true)
      dragTrackingCleanup.current = null
    }
    window.addEventListener('pointermove', track, true)
    window.addEventListener('touchmove', track, true)
    dragTrackingCleanup.current = cleanup
  }

  const stopDragTracking = () => {
    dragTrackingCleanup.current?.()
    const point = dragPoint.current
    dragPoint.current = null
    return point
  }

  const selectTaskEventElement = (id: string, element: HTMLElement) => {
    for (const other of rootRef.current?.querySelectorAll('.chronos-event-selected') ?? []) {
      other.classList.remove('chronos-event-selected')
    }
    element.classList.add('chronos-event-selected')
    onSelectEvent?.(id)
  }
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
    <div ref={rootRef} onPointerDownCapture={(event) => { selection.onPointerDown(); onSurfacePointerDown?.(event) }} className="chronos-calendar-surface relative h-full" style={{ '--calendar-zoom': zoom / 100 } as CSSProperties}>
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
      eventClass={(info) => `chronos-event${info.event.extendedProps.selected ? ' chronos-event-selected' : ''}`}
      eventContent={eventContent}
      editable={!pinching}
      eventStartEditable
      eventDurationEditable
      eventDragMinDistance={2}
      longPressDelay={250}
      eventLongPressDelay={250}
      selectLongPressDelay={250}
      selectable={!pinching}
      selectMirror={false}
      selectMinDistance={4}
      unselectAuto={false}
      droppable
      dropAccept=".chronos-task-item--active"
      select={selection.onSelect}
      unselect={selection.onUnselect}
      dateClick={selection.onDateClick}
      eventClick={(info) => {
        if (ignoresInteraction()) return
        selection.clear()
        if (info.event.extendedProps.taskId && selectedEventId !== info.event.id) {
          selectTaskEventElement(info.event.id, info.el)
          return
        }
        onEventClick(info)
      }}
      eventDragStart={(info) => {
        dropOnTaskRef.current = null
        if (info.event.extendedProps.taskId) {
          setDraggingTaskEventId(info.event.id)
          selectTaskEventElement(info.event.id, info.el)
          startDragTracking({ clientX: info.jsEvent.clientX, clientY: info.jsEvent.clientY })
        }
      }}
      eventDragStop={(info) => {
        const isTask = Boolean(info.event.extendedProps.taskId)
        if (isTask) selectTaskEventElement(info.event.id, info.el)
        const point = stopDragTracking()
        const overTask = isTask && point !== null && isOverTaskDropzone(point)
        dropOnTaskRef.current = overTask ? info.event.id : null
        setDraggingTaskEventId(null)
        if (overTask) onUnscheduleEvent?.(info.event)
      }}
      eventDrop={(info) => {
        if (dropOnTaskRef.current === info.event.id) {
          dropOnTaskRef.current = null
          info.revert()
          return
        }
        if (ignoresInteraction()) info.revert()
        else onEventDrop(info)
      }}
      eventResizeStart={(info) => {
        if (info.event.extendedProps.taskId) selectTaskEventElement(info.event.id, info.el)
      }}
      eventResize={(info) => { if (ignoresInteraction()) info.revert(); else onEventResize(info) }}
      eventReceive={(info) => {
        if (ignoresInteraction()) { info.event.remove(); return }
        selection.clear()
        onTaskDrop(info)
      }}
      datesSet={(info) => {
        selection.clear()
        const previous = previousFrame.current
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        let direction = 0
        if (!previous) {
          // 首次 datesSet 通常是加载周视图；若用户抢在首次渲染前切换了视图，
          // 这里仍按视图层级补一个方向，避免第一次切换没有滑动效果。
          if (info.view.type !== 'timeGridWeek') {
            direction = (VIEW_RANK[info.view.type] ?? 0) > (VIEW_RANK.timeGridWeek ?? 0) ? 1 : -1
          }
        } else if (previous.type !== info.view.type) {
          direction = (VIEW_RANK[info.view.type] ?? 0) > (VIEW_RANK[previous.type] ?? 0) ? 1 : -1
        } else if (previous.start !== info.view.currentStart.getTime()) {
          direction = info.view.currentStart.getTime() > previous.start ? 1 : -1
        }
        if (direction !== 0 && !reduceMotion) {
          transition.current?.cancel()
          transition.current = rootRef.current?.animate([
            { transform: `translateX(${direction * 42}px)` },
            { transform: 'translateX(0)' },
          ], { duration: 320, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' }) ?? null
        } else if (reduceMotion) {
          transition.current?.cancel()
        }
        previousFrame.current = { type: info.view.type, start: info.view.currentStart.getTime() }
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
    <SelectionOverlay rootRef={rootRef} selection={selection.selection} zoom={zoom} onRangeChange={selection.setRange} />
    {draggingTaskEventId && (
      <div className="chronos-task-dropzone md:hidden" data-task-dropzone="true">
        <strong>移回待办清单</strong>
        <span>松手后把此日程恢复为待办</span>
      </div>
    )}
    {selection.selection && !pinching && (
      <div className="chronos-selection-hint">
        <span role="status">
          已选中 {format(selection.selection.start, selection.selection.allDay ? 'M/d' : 'M/d HH:mm')}
          {selection.selection.allDay ? ' · 全天' : `–${format(selection.selection.end, 'HH:mm')}`} · 拖动上下粗线调整 · 再次点击选中区域创建日程
        </span>
        <span className="chronos-selection-actions">
          <button
            type="button"
            onClick={() => {
              const selected = selection.selection
              if (!selected) return
              selection.clear()
              onSelect(selected)
            }}
            className="chronos-selection-primary"
          >
            新建日程
          </button>
          <button type="button" onClick={selection.clear} className="chronos-selection-cancel">
            取消
          </button>
        </span>
      </div>
    )}
    </div>
  )
}
