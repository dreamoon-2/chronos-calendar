import { useCallback, useMemo, useRef, useState } from 'react'
import {
  type CalendarRef,
  type DateClickInfo,
  type DateSelectInfo,
  type EventClickInfo,
  type EventDropInfo,
  type EventResizeDoneInfo,
} from '@fullcalendar/react'
import { addDays, addHours, format } from 'date-fns'
import type { EventRow, EventUpdate } from '../../types/database'
import { AppShell } from '../../components/layout/AppShell'
import { useToast } from '../../components/ui/Toast'
import { useBackButton } from '../../lib/backButton'
import { ConflictError, toErrorMessage } from '../../lib/errors'
import { toDateOnly, toInclusiveEndDate } from '../../lib/dates'
import { useAuth } from '../auth/AuthProvider'
import { useCategories } from '../categories/categoryQueries'
import { EventDetails } from '../events/EventDetails'
import { EventEditor } from '../events/EventEditor'
import { toCalendarEvent, type CalendarEvent } from '../events/eventMappers'
import {
  emptyForm,
  eventToForm,
  type EventFormValues,
} from '../events/eventSchema'
import { useEventsInRange, useInvalidateAll } from '../events/eventQueries'
import { updateEvent as updateEventApi } from '../events/eventsApi'
import {
  useEventsRealtime,
  useResyncOnRecover,
} from '../events/useEventsRealtime'
import { SettingsPage } from '../settings/SettingsPage'
import { CalendarGrid } from './CalendarGrid'
import { Sidebar } from './Sidebar'
import { useCalendarRange } from './useCalendarRange'

interface EditorState {
  mode: 'create' | 'edit'
  initial: EventFormValues
  eventId?: string
  version?: number
}

function selectToForm(info: DateSelectInfo): EventFormValues {
  if (info.allDay) {
    const start = toDateOnly(info.start)
    const end = toInclusiveEndDate(toDateOnly(info.end))
    return { ...emptyForm(), allDay: true, startDate: start, endDate: end }
  }
  return {
    ...emptyForm(),
    allDay: false,
    startDate: toDateOnly(info.start),
    startTime: format(info.start, 'HH:mm'),
    endDate: toDateOnly(info.end),
    endTime: format(info.end, 'HH:mm'),
  }
}

function dateClickToForm(info: DateClickInfo): EventFormValues {
  if (info.allDay) {
    const d = toDateOnly(info.date)
    return { ...emptyForm(), allDay: true, startDate: d, endDate: d }
  }
  const end = addHours(info.date, 1)
  return {
    ...emptyForm(),
    allDay: false,
    startDate: toDateOnly(info.date),
    startTime: format(info.date, 'HH:mm'),
    endDate: toDateOnly(end),
    endTime: format(end, 'HH:mm'),
  }
}

/** 把拖拽/拉伸后的事件实例转成与数据库一致的载荷。 */
function eventApiToPatch(event: {
  allDay: boolean
  start: Date | null
  end: Date | null
}): EventUpdate {
  if (event.allDay) {
    if (!event.start) throw new Error('invalid all-day start')
    const end = event.end ?? addDays(event.start, 1)
    return {
      all_day: true,
      start_date: toDateOnly(event.start),
      end_date: toDateOnly(end),
      start_at: null,
      end_at: null,
    }
  }
  if (!event.start || !event.end) throw new Error('invalid timed range')
  return {
    all_day: false,
    start_at: event.start.toISOString(),
    end_at: event.end.toISOString(),
    start_date: null,
    end_date: null,
  }
}

export function CalendarPage() {
  const { user, isDemo } = useAuth()
  const toast = useToast()
  const calendarRef = useRef<CalendarRef>(null)

  const { range, viewType, currentDate, title, handleDatesSet } =
    useCalendarRange()
  const categoriesQ = useCategories()
  const eventsQ = useEventsInRange(range)
  useEventsRealtime()
  useResyncOnRecover()
  const invalidateAll = useInvalidateAll()

  const [editor, setEditor] = useState<EditorState | null>(null)
  const [details, setDetails] = useState<CalendarEvent | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(
    () => new Set(),
  )
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Android 返回键：优先关闭弹层，否则退出应用
  useBackButton(
    useCallback(() => {
      if (editor) {
        setEditor(null)
        return true
      }
      if (details) {
        setDetails(null)
        return true
      }
      if (settingsOpen) {
        setSettingsOpen(false)
        return true
      }
      return false
    }, [editor, details, settingsOpen]),
  )

  const categoryById = useMemo(
    () => new Map((categoriesQ.data ?? []).map((c) => [c.id, c])),
    [categoriesQ.data],
  )

  const calendarEvents = useMemo(
    () =>
      (eventsQ.data ?? []).map((r) =>
        toCalendarEvent(r, categoryById.get(r.category_id ?? '')),
      ),
    [eventsQ.data, categoryById],
  )

  const visibleEvents = useMemo(() => {
    if (hiddenCategories.size === 0) return calendarEvents
    return calendarEvents.filter((e) => {
      const cid = e.extendedProps.categoryId
      if (cid == null) return true
      return !hiddenCategories.has(cid)
    })
  }, [calendarEvents, hiddenCategories])

  const api = useCallback(() => calendarRef.current?.getApi(), [])

  const toggleCategory = useCallback((id: string) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const showAllCategories = useCallback(() => {
    setHiddenCategories(new Set())
  }, [])

  const gotoDate = useCallback(
    (date: Date) => {
      api()?.gotoDate(date)
    },
    [api],
  )

  const openCreate = useCallback(
    (initial?: EventFormValues) => {
      api()?.unselect()
      setEditor({ mode: 'create', initial: initial ?? emptyForm() })
    },
    [api],
  )

  const openEdit = useCallback((event: CalendarEvent) => {
    setDetails(null)
    setEditor({
      mode: 'edit',
      initial: eventToForm(event.extendedProps.raw),
      eventId: event.id,
      version: event.extendedProps.version,
    })
  }, [])

  const onSelect = useCallback(
    (info: DateSelectInfo) => {
      api()?.unselect()
      setEditor({ mode: 'create', initial: selectToForm(info) })
    },
    [api],
  )

  const onDateClick = useCallback((info: DateClickInfo) => {
    setEditor({ mode: 'create', initial: dateClickToForm(info) })
  }, [])

  const onEventClick = useCallback(
    (info: EventClickInfo) => {
      const raw = info.event.extendedProps.raw as EventRow | undefined
      if (!raw) return
      setDetails(toCalendarEvent(raw, categoryById.get(raw.category_id ?? '')))
    },
    [categoryById],
  )

  const onEventDrop = useCallback(
    async (info: EventDropInfo) => {
      const version = info.event.extendedProps.version as number | undefined
      if (version == null || !user) {
        info.revert()
        return
      }
      let patch: EventUpdate
      try {
        patch = eventApiToPatch(info.event)
      } catch {
        info.revert()
        toast.error('时间无效，已撤销')
        return
      }
      try {
        await updateEventApi(user.id, info.event.id, version, patch)
        toast.success('已移动日程')
      } catch (err) {
        info.revert()
        if (err instanceof ConflictError) {
          toast.error('该日程已在其他设备更新，请重新加载')
        } else {
          toast.error(toErrorMessage(err))
        }
      } finally {
        invalidateAll()
      }
    },
    [user, toast, invalidateAll],
  )

  const onEventResize = useCallback(
    async (info: EventResizeDoneInfo) => {
      const version = info.event.extendedProps.version as number | undefined
      if (version == null || !user) {
        info.revert()
        return
      }
      let patch: EventUpdate
      try {
        patch = eventApiToPatch(info.event)
      } catch {
        info.revert()
        toast.error('时间无效，已撤销')
        return
      }
      try {
        await updateEventApi(user.id, info.event.id, version, patch)
        toast.success('已调整时长')
      } catch (err) {
        info.revert()
        if (err instanceof ConflictError) {
          toast.error('该日程已在其他设备更新，请重新加载')
        } else {
          toast.error(toErrorMessage(err))
        }
      } finally {
        invalidateAll()
      }
    },
    [user, toast, invalidateAll],
  )

  return (
    <>
      <AppShell
        isDemo={isDemo}
        title={title}
        viewType={viewType}
        onPrev={() => api()?.prev()}
        onNext={() => api()?.next()}
        onToday={() => api()?.today()}
        onChangeView={(v) => api()?.changeView(v)}
        onCreate={() => openCreate()}
        onOpenSettings={() => setSettingsOpen(true)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        sidebar={
          <Sidebar
            currentDate={currentDate}
            categories={categoriesQ.data ?? []}
            hiddenCategories={hiddenCategories}
            onToggleCategory={toggleCategory}
            onShowAllCategories={showAllCategories}
            onGotoDate={gotoDate}
          />
        }
      >
        <div className="h-full p-0 sm:p-3">
          <div className="h-full overflow-hidden rounded-none bg-white shadow-sm dark:bg-slate-900 sm:rounded-xl sm:border sm:border-slate-200 dark:sm:border-slate-800">
            <CalendarGrid
              calendarRef={calendarRef}
              events={visibleEvents}
              onDatesSet={handleDatesSet}
              onSelect={onSelect}
              onDateClick={onDateClick}
              onEventClick={onEventClick}
              onEventDrop={onEventDrop}
              onEventResize={onEventResize}
            />
          </div>
        </div>
      </AppShell>

      {editor && (
        <EventEditor
          mode={editor.mode}
          initial={editor.initial}
          eventId={editor.eventId}
          version={editor.version}
          categories={categoriesQ.data ?? []}
          onClose={() => setEditor(null)}
        />
      )}

      <EventDetails
        event={details}
        onClose={() => setDetails(null)}
        onEdit={() => {
          if (details) openEdit(details)
        }}
      />

      <SettingsPage open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
