import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import Calendar, {
  type CalendarRef,
  type DateSelectInfo,
  type DatesSetInfo,
  type DayHeaderInfo,
  type EventApi,
  type EventClickInfo,
  type EventDisplayInfo,
  type EventDropInfo,
  type EventReceiveInfo,
  type EventResizeDoneInfo,
  type ListDayHeaderInnerInfo,
  type SlotHeaderInfo,
} from '@fullcalendar/react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import dayGridPlugin from '@fullcalendar/react/daygrid'
import timeGridPlugin from '@fullcalendar/react/timegrid'
import multiMonthPlugin from '@fullcalendar/react/multimonth'
import listPlugin from '@fullcalendar/react/list'
import interactionPlugin from '@fullcalendar/react/interaction'
import themePlugin from '@fullcalendar/react/themes/classic'
import zhCn from '@fullcalendar/react/locales/zh-cn'
import type { CalendarEvent } from '../events/eventMappers'
import { dateSubLabel } from '../../utils/lunar'
import { CalendarEventCard } from './CalendarEventCard'
import { SelectionOverlay } from './SelectionOverlay'
import { useCalendarGestures } from './useCalendarGestures'
import { useCalendarSwipe } from './useCalendarSwipe'
import { useCalendarSelection } from './useCalendarSelection'
import { activeViewIndex } from './calendarViews'

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
  onSelectEvent?: (id: string | null) => void
  onUnscheduleEvent?: (event: EventApi) => void
  /** 移动端点击日历空白处时收起待办抽屉。 */
  onSurfacePointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void
  /** 移动端左右滑动切换视图：1 为更细的视图，-1 为更粗的视图。 */
  onSwipeView: (direction: 1 | -1) => void
}

// 模块级常量，保证引用稳定，避免 FullCalendar React 反复重渲染。
const VIEWS = {
  dayGridMonth: { dayRowClass: 'chronos-month-row' },
  timeGridWeek: { expandRows: false },
  timeGridDay: { expandRows: false },
  multiMonthYear: { multiMonthMaxColumns: 3 },
  listWeek: {},
} as const

const PLUGINS = [
  themePlugin,
  dayGridPlugin,
  timeGridPlugin,
  multiMonthPlugin,
  listPlugin,
  interactionPlugin,
]

const TIME_FORMAT = { hour: '2-digit', minute: '2-digit', hour12: false } as const

function isOverTaskDropzone(point: { clientX: number; clientY: number }): boolean {
  if (!Number.isFinite(point.clientX) || !Number.isFinite(point.clientY)) return false
  return document.elementsFromPoint(point.clientX, point.clientY)
    .some((element) => element.closest('[data-task-dropzone]') !== null)
}

function CalendarGridInner({
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
  onSwipeView,
}: CalendarGridProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const gestures = useCalendarGestures(rootRef, calendarRef, zoom, onChangeZoom)
  const swipeIgnoreRef = useRef<() => boolean>(() => false)
  const selection = useCalendarSelection(
    calendarRef,
    onSelect,
    () => gestures.ignoresInteraction() || swipeIgnoreRef.current(),
  )
  const swipe = useCalendarSwipe(rootRef, {
    onSwipe: onSwipeView,
    onSwipeStart: selection.clear,
  })
  useLayoutEffect(() => {
    swipeIgnoreRef.current = swipe.ignoresInteraction
  }, [swipe.ignoresInteraction])

  const [draggingTaskEventId, setDraggingTaskEventId] = useState<string | null>(null)
  const dropOnTaskRef = useRef<string | null>(null)
  const dragPoint = useRef<{ clientX: number; clientY: number } | null>(null)
  const dragTrackingCleanup = useRef<(() => void) | null>(null)

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

  const ignoresInteraction = () =>
    gestures.ignoresInteraction() || swipe.ignoresInteraction()

  const eventClass = useCallback(
    (info: { event: EventApi }) =>
      `chronos-event${info.event.id === selectedEventId ? ' chronos-event-selected' : ''}`,
    [selectedEventId],
  )

  const previousFrame = useRef<{ type: string; start: number } | null>(null)
  const transition = useRef<Animation | null>(null)

  const views = useMemo(() => VIEWS, [])
  const plugins = useMemo(() => PLUGINS, [])
  const locales = useMemo(() => [zhCn], [])

  const eventContent = useCallback(
    (info: EventDisplayInfo) => <CalendarEventCard info={info} />,
    [],
  )
  const dayCellClass = useCallback(
    (info: { isToday: boolean; view: { type: string } }) =>
      `${info.isToday && info.view.type !== 'timeGridDay' ? 'chronos-today' : ''} ${info.view.type === 'dayGridMonth' ? 'chronos-month-cell' : ''}`,
    [],
  )
  const dayHeaderClass = useCallback(
    (info: { isToday: boolean }) =>
      `chronos-day-header${info.isToday ? ' chronos-today-header' : ''}`,
    [],
  )

  const dayHeaderContent = useCallback((info: DayHeaderInfo) => {
    const monthView = info.view.type === 'dayGridMonth' || info.view.type === 'multiMonthYear'
    if (monthView) {
      return (
        <span className="chronos-month-weekday">
          {format(info.date, 'EEEEE', { locale: zhCN })}
        </span>
      )
    }
    const weekday = format(info.date, 'EEEEE', { locale: zhCN })
    const monthLabel = format(info.date, 'M月', { locale: zhCN })
    // 周视图跨月时在 1 号显示月份；日视图在星期前显示月份，避免只有日期数字。
    const topLine = info.view.type === 'timeGridDay'
      ? `${monthLabel} · ${format(info.date, 'EEE', { locale: zhCN })}`
      : info.date.getDate() === 1
        ? monthLabel
        : weekday
    return (
      <div className="chronos-date-heading">
        <span className="chronos-weekday">{topLine}</span>
        <span className="chronos-date-number">{format(info.date, 'd')}</span>
        <span className="chronos-date-lunar">{dateSubLabel(info.date) ?? ''}</span>
      </div>
    )
  }, [])

  const slotHeaderContent = useCallback((info: SlotHeaderInfo) => {
    if (!info.isTime || !info.date) return info.text
    return <span className="chronos-hour-label">{info.date.getHours()}</span>
  }, [])

  const allDayHeaderContent = useCallback(() => (
    <span className="chronos-allday-label">全天</span>
  ), [])

  const listDayHeaderContent = useCallback((info: ListDayHeaderInnerInfo) => {
    // FullCalendar 会为同一天渲染左右两个标题块：左侧放星期与日期，右侧只放农历/节气。
    if (info.level === 1) {
      return <span className="chronos-agenda-lunar">{dateSubLabel(info.date) ?? ''}</span>
    }
    return (
      <div className="chronos-agenda-day">
        <span className="chronos-agenda-weekday">{format(info.date, 'EEE', { locale: zhCN })}</span>
        <span className="chronos-agenda-date">{format(info.date, 'M月d日', { locale: zhCN })}</span>
      </div>
    )
  }, [])

  const noEventsContent = useCallback(() => (
    <div className="chronos-agenda-empty">
      <p>这一周还没有安排</p>
      <span>点击右下角 ＋ 新建日程</span>
    </div>
  ), [])

  // 只在组件卸载时取消动画，避免遗留的 Animation 持有 DOM。
  useEffect(() => () => transition.current?.cancel(), [])

  return (
    <div
      ref={rootRef}
      onPointerDownCapture={(event) => {
        selection.onPointerDown()
        onSurfacePointerDown?.(event)
      }}
      className="chronos-calendar-surface relative h-full"
      data-calendar-zoom={zoom}
      style={{ '--calendar-zoom': zoom / 100 } as CSSProperties}
    >
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
        eventClass={eventClass}
        eventContent={eventContent}
        editable={!gestures.pinching}
        eventStartEditable
        eventDurationEditable
        eventDragMinDistance={2}
        longPressDelay={250}
        eventLongPressDelay={250}
        selectLongPressDelay={250}
        selectable={!gestures.pinching}
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
          // 待办日程使用两步操作：第一次点击选中（可拖动／拉伸），再次点击进入编辑。
          if (info.event.extendedProps.taskId && selectedEventId !== info.event.id) {
            onSelectEvent?.(info.event.id)
            return
          }
          onEventClick(info)
        }}
        eventDragStart={(info) => {
          dropOnTaskRef.current = null
          if (info.event.extendedProps.taskId) {
            onSelectEvent?.(info.event.id)
            setDraggingTaskEventId(info.event.id)
            startDragTracking({ clientX: info.jsEvent.clientX, clientY: info.jsEvent.clientY })
          }
        }}
        eventDragStop={(info) => {
          const isTask = Boolean(info.event.extendedProps.taskId)
          if (isTask) onSelectEvent?.(info.event.id)
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
          if (info.event.extendedProps.taskId) onSelectEvent?.(info.event.id)
        }}
        eventResize={(info) => {
          if (ignoresInteraction()) info.revert()
          else onEventResize(info)
        }}
        eventReceive={(info) => {
          if (ignoresInteraction()) {
            info.event.remove()
            return
          }
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
            direction = activeViewIndex(info.view.type) - activeViewIndex('timeGridWeek')
          } else if (previous.type !== info.view.type) {
            direction = activeViewIndex(info.view.type) - activeViewIndex(previous.type)
          } else if (previous.start !== info.view.currentStart.getTime()) {
            direction = info.view.currentStart.getTime() > previous.start ? 1 : -1
          }
          if (direction !== 0 && !reduceMotion) {
            transition.current?.cancel()
            transition.current = rootRef.current?.animate([
              { transform: `translateX(${Math.sign(direction) * 42}px)` },
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
        dayHeaderFormat={{ weekday: 'short' }}
        dayHeaderAlign="center"
        dayCellFormat={{ day: 'numeric' }}
        dayCellClass={dayCellClass}
        dayHeaderClass={dayHeaderClass}
        dayHeaderContent={dayHeaderContent}
        slotHeaderContent={slotHeaderContent}
        slotHeaderAlign="center"
        allDayHeaderContent={allDayHeaderContent}
        listDayHeaderContent={listDayHeaderContent}
        noEventsContent={noEventsContent}
        eventTimeFormat={TIME_FORMAT}
        slotHeaderFormat={TIME_FORMAT}
        views={views}
        singleMonthClass="chronos-year-month"
        singleMonthHeaderClass="chronos-year-month-heading"
        singleMonthMinWidth={Math.max(180, 280 * zoom / 100)}
      />
      <SelectionOverlay
        rootRef={rootRef}
        selection={selection.selection}
        zoom={zoom}
        onRangeChange={selection.setRange}
      />
      {draggingTaskEventId && (
        <div className="chronos-task-dropzone md:hidden" data-task-dropzone="true">
          <strong>移回待办清单</strong>
          <span>松手后把此日程恢复为待办</span>
        </div>
      )}
      {selection.selection && !gestures.pinching && (
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

/** 日历页只在事件/视图/缩放变化时重渲染；打开编辑器、设置或详情不会触发 FullCalendar 重新排版。 */
export const CalendarGrid = memo(CalendarGridInner)
