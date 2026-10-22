import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type CalendarRef,
  type DateSelectInfo,
  type DatesSetInfo,
  type EventClickInfo,
  type EventDropInfo,
  type EventReceiveInfo,
  type EventResizeDoneInfo,
} from '@fullcalendar/react'
import { addDays, format } from 'date-fns'
import type { EventRow, EventUpdate, TaskRow } from '../../types/database'
import { AppShell } from '../../components/layout/AppShell'
import { useToast } from '../../components/ui/Toast'
import { useBackButton } from '../../hooks/useBackButton'
import { ConflictError, toErrorMessage } from '../../utils/errors'
import { toDateOnly, toInclusiveEndDate } from '../../utils/dates'
import { useAuth } from '../auth/AuthProvider'
import { useCategories } from '../categories/categoryQueries'
import { EventDetails } from '../events/EventDetails'
import { EventEditor } from '../events/EventEditor'
import { EventDraftList } from '../events/EventDraftList'
import { toCalendarEvent, type CalendarEvent } from '../events/eventMappers'
import {
  emptyForm,
  eventToForm,
  type EventFormValues,
} from '../events/eventSchema'
import { useEventsInRange, useInvalidateAll, useCreateEvent } from '../events/eventQueries'
import { updateEvent as updateEventApi } from '../events/eventsApi'
import {
  useEventsRealtime,
  useResyncOnRecover,
} from '../events/useEventsRealtime'
import { SettingsPage } from '../settings/SettingsPage'
import {
  useCreateTask,
  useDeleteTask,
  useTasks,
  useUnscheduleTaskEvent,
  useUpdateTask,
} from '../tasks/taskQueries'
import { TaskPanel } from '../tasks/TaskPanel'
import { TaskSheet } from '../tasks/TaskSheet'
import { CalendarGrid } from './CalendarGrid'
import { Sidebar } from './Sidebar'
import { useCalendarRange } from './useCalendarRange'
import { useCalendarZoom } from './useCalendarZoom'
import { useEventUndo } from '../events/useEventUndo'
import { useDesktopReminders } from '../desktop/useDesktopReminders'

interface EditorState {
  mode: 'create' | 'edit'
  initial: EventFormValues
  eventId?: string
  version?: number
  original?: EventRow
  draftId?: string
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
  const { zoom, changeZoom } = useCalendarZoom()
  const { latest: undoEntry, busy: undoBusy, remember, forget, undo } = useEventUndo()
  useDesktopReminders()

  const { range, viewType, currentDate, title, handleDatesSet } =
    useCalendarRange()
  const categoriesQ = useCategories()
  const eventsQ = useEventsInRange(range)
  useEventsRealtime()
  useResyncOnRecover()
  const invalidateAll = useInvalidateAll()

  const [editor, setEditor] = useState<EditorState | null>(null)
  const editorCloseRef = useRef<(() => void) | null>(null)
  const [draftsOpen, setDraftsOpen] = useState(false)
  const [details, setDetails] = useState<CalendarEvent | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(
    () => new Set(),
  )
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [tasksOpen, setTasksOpen] = useState(false)
  const [selectedTaskEventId, setSelectedTaskEventId] = useState<string | null>(null)
  // 以服务端最新一行为准，避免 FullCalendar 事件对象在拖动/刷新后仍保留旧 version。
  const latestRows = useRef(new Map<string, EventRow>())
  const busyEvents = useRef(new Set<string>())

  useEffect(() => {
    const rows = latestRows.current
    for (const row of eventsQ.data ?? []) {
      const known = rows.get(row.id)
      if (known == null || row.version > known.version) rows.set(row.id, row)
    }
  }, [eventsQ.data])

  const runUndo = useCallback(async () => {
    const restored = await undo()
    if (restored) latestRows.current.set(restored.id, restored)
  }, [undo])

  const tasksQ = useTasks()
  const createTaskM = useCreateTask()
  const updateTaskM = useUpdateTask()
  const deleteTaskM = useDeleteTask()
  const unscheduleTaskEventM = useUnscheduleTaskEvent()
  const createEventM = useCreateEvent()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement | null
      if (editor || settingsOpen || draftsOpen || element?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (event.key === 'Escape' && selectedTaskEventId) {
        setSelectedTaskEventId(null)
        return
      }
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        setDetails(null)
        void runUndo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editor, settingsOpen, draftsOpen, selectedTaskEventId, runUndo])

  // Android 返回键：优先关闭弹层，否则退出应用
  useBackButton(
    useCallback(() => {
      if (editor) {
        editorCloseRef.current?.()
        return true
      }
      if (draftsOpen) { setDraftsOpen(false); return true }
      if (tasksOpen) { setTasksOpen(false); return true }
      if (selectedTaskEventId) { setSelectedTaskEventId(null); return true }
      if (details) {
        setDetails(null)
        return true
      }
      if (settingsOpen) {
        setSettingsOpen(false)
        return true
      }
      return false
    }, [editor, details, settingsOpen, draftsOpen, tasksOpen, selectedTaskEventId]),
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

  const onCalendarDatesSet = useCallback(
    (info: DatesSetInfo) => {
      setSelectedTaskEventId(null)
      handleDatesSet(info)
    },
    [handleDatesSet],
  )

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
      setTasksOpen(false)
      setSelectedTaskEventId(null)
      setEditor({ mode: 'create', initial: initial ?? emptyForm() })
    },
    [api],
  )

  const openEdit = useCallback((event: CalendarEvent) => {
    const raw = latestRows.current.get(event.id) ?? event.extendedProps.raw
    setDetails(null)
    setTasksOpen(false)
    setSelectedTaskEventId(null)
    setEditor({
      mode: 'edit',
      initial: eventToForm(raw),
      eventId: event.id,
      version: raw.version,
      original: raw,
    })
  }, [])

  const onSelect = useCallback(
    (info: DateSelectInfo) => {
      api()?.unselect()
      setSelectedTaskEventId(null)
      setEditor({ mode: 'create', initial: selectToForm(info) })
    },
    [api],
  )

  const onEventClick = useCallback(
    (info: EventClickInfo) => {
      const raw = info.event.extendedProps.raw as EventRow | undefined
      if (!raw) return
      const latest = latestRows.current.get(raw.id) ?? raw
      const calendarEvent = toCalendarEvent(latest, categoryById.get(latest.category_id ?? ''))
      // 待办日程使用两步操作：第一次点击选中（可拖动／拉伸），再次点击进入编辑。
      if (latest.task_id) {
        if (selectedTaskEventId === info.event.id) {
          setSelectedTaskEventId(null)
          openEdit(calendarEvent)
        } else {
          setSelectedTaskEventId(info.event.id)
        }
        return
      }
      setSelectedTaskEventId(null)
      setDetails(calendarEvent)
    },
    [categoryById, selectedTaskEventId, openEdit],
  )

  const onEventDrop = useCallback(
    async (info: EventDropInfo) => {
      const eventId = info.event.id
      const known = latestRows.current.get(eventId)
      const version = known?.version ??
        (info.event.extendedProps.version as number | undefined)
      if (version == null || !user || undoBusy || busyEvents.current.has(eventId)) {
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
      busyEvents.current.add(eventId)
      try {
        const before = known ?? (info.oldEvent.extendedProps.raw as EventRow)
        const after = await updateEventApi(user.id, eventId, version, patch)
        latestRows.current.set(eventId, after)
        info.event.setExtendedProp('version', after.version)
        info.event.setExtendedProp('raw', after)
        remember(before, after, '移动')
        toast.success('已移动日程')
      } catch (err) {
        info.revert()
        if (err instanceof ConflictError) {
          latestRows.current.delete(eventId)
          await eventsQ.refetch()
          toast.error('该日程已在其他设备更新，已刷新，请重试')
        } else {
          toast.error(toErrorMessage(err))
        }
      } finally {
        busyEvents.current.delete(eventId)
        invalidateAll()
      }
    },
    [user, toast, invalidateAll, undoBusy, remember, eventsQ],
  )

  const onEventResize = useCallback(
    async (info: EventResizeDoneInfo) => {
      const eventId = info.event.id
      const known = latestRows.current.get(eventId)
      const version = known?.version ??
        (info.event.extendedProps.version as number | undefined)
      if (version == null || !user || undoBusy || busyEvents.current.has(eventId)) {
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
      busyEvents.current.add(eventId)
      try {
        const before = known ?? (info.oldEvent.extendedProps.raw as EventRow)
        const after = await updateEventApi(user.id, eventId, version, patch)
        latestRows.current.set(eventId, after)
        info.event.setExtendedProp('version', after.version)
        info.event.setExtendedProp('raw', after)
        remember(before, after, '调整时长')
        toast.success('已调整时长')
      } catch (err) {
        info.revert()
        if (err instanceof ConflictError) {
          latestRows.current.delete(eventId)
          await eventsQ.refetch()
          toast.error('该日程已在其他设备更新，已刷新，请重试')
        } else {
          toast.error(toErrorMessage(err))
        }
      } finally {
        busyEvents.current.delete(eventId)
        invalidateAll()
      }
    },
    [user, toast, invalidateAll, undoBusy, remember, eventsQ],
  )

  const defaultTaskCategoryId = useMemo(
    () => (categoriesQ.data ?? []).find((category) => category.name === '任务')?.id ?? null,
    [categoriesQ.data],
  )

  const activeTaskCount = useMemo(
    () => (tasksQ.data ?? []).filter((task) => !task.done).length,
    [tasksQ.data],
  )

  const tasksError = tasksQ.isError ? toErrorMessage(tasksQ.error) : null

  const addTask = useCallback(
    async (title: string) => {
      try {
        await createTaskM.mutateAsync({
          title,
          category_id: defaultTaskCategoryId,
          estimated_minutes: 60,
        })
      } catch (err) {
        toast.error(toErrorMessage(err))
        throw err
      }
    },
    [createTaskM, defaultTaskCategoryId, toast],
  )

  const toggleTask = useCallback(
    (task: TaskRow, done: boolean) => {
      updateTaskM.mutate(
        { id: task.id, patch: { done } },
        { onError: (err) => toast.error(toErrorMessage(err)) },
      )
    },
    [updateTaskM, toast],
  )

  const removeTask = useCallback(
    (task: TaskRow) => {
      deleteTaskM.mutate(task.id, {
        onError: (err) => toast.error(toErrorMessage(err)),
      })
    },
    [deleteTaskM, toast],
  )

  const onTaskDrop = useCallback(
    async (info: EventReceiveInfo) => {
      setSelectedTaskEventId(null)
      const taskId = info.draggedEl.dataset.taskId
      const task = (tasksQ.data ?? []).find((item) => item.id === taskId)
      const allDay = info.event.allDay
      const start = info.event.start
      const end = info.event.end
      // 先移除 FullCalendar 为外部拖拽临时创建的事件，真正的记录由 API 写入。
      info.event.remove()
      if (!task || !start) {
        toast.error('没有找到对应待办，请重试')
        return
      }
      const finish = end ?? new Date(start.getTime() + task.estimated_minutes * 60_000)
      const categoryId = task.category_id && categoryById.has(task.category_id)
        ? task.category_id
        : defaultTaskCategoryId
      const timePayload = allDay
        ? {
            all_day: true,
            start_date: toDateOnly(start),
            end_date: toDateOnly(addDays(start, 1)),
            start_at: null,
            end_at: null,
          }
        : {
            all_day: false,
            start_at: start.toISOString(),
            end_at: finish.toISOString(),
            start_date: null,
            end_date: null,
          }
      try {
        const saved = await createEventM.mutateAsync({
          title: task.title,
          description: task.notes,
          category_id: categoryId,
          task_id: task.id,
          ...timePayload,
        })
        latestRows.current.set(saved.id, saved)
        try {
          await updateTaskM.mutateAsync({ id: task.id, patch: { done: true } })
        } catch (err) {
          toast.error(`日程已创建，但待办状态更新失败：${toErrorMessage(err)}`)
        }
        toast.success(
          allDay
            ? `已排入日程 · ${format(start, 'M/d')} 全天`
            : `已排入日程 · ${format(start, 'M/d HH:mm')}–${format(finish, 'HH:mm')}`,
        )
        setTasksOpen(false)
      } catch (err) {
        toast.error(toErrorMessage(err))
      }
    },
    [tasksQ.data, createEventM, updateTaskM, defaultTaskCategoryId, categoryById, toast],
  )

  const unscheduleEvent = useCallback(
    async (event: EventRow) => {
      if (!event.task_id) return
      const known = latestRows.current.get(event.id)
      const version = known?.version ?? event.version
      try {
        await unscheduleTaskEventM.mutateAsync({
          eventId: event.id,
          version,
          taskId: event.task_id,
        })
        latestRows.current.delete(event.id)
        busyEvents.current.delete(event.id)
        forget(event.id)
        setSelectedTaskEventId(null)
        setDetails(null)
        toast.clear()
        toast.success(`已将「${event.title}」移回待办清单`)
      } catch (err) {
        toast.error(toErrorMessage(err))
        throw err
      }
    },
    [unscheduleTaskEventM, toast, forget],
  )

  const selectTaskEvent = useCallback((id: string) => {
    setSelectedTaskEventId(id)
  }, [])

  const handleEventChanged = useCallback(
    (before: EventRow, after: EventRow, label: string) => {
      if (after.deleted_at) latestRows.current.delete(after.id)
      else latestRows.current.set(after.id, after)
      remember(before, after, label)
    },
    [remember],
  )

  return (
    <>
      <AppShell
        isDemo={isDemo}
        title={title}
        viewType={viewType}
        zoom={zoom}
        onChangeZoom={changeZoom}
        onPrev={() => api()?.prev()}
        onNext={() => api()?.next()}
        onToday={() => api()?.today()}
        onChangeView={(v) => api()?.changeView(v)}
        onCreate={() => openCreate()}
        onOpenDrafts={() => { api()?.unselect(); setTasksOpen(false); setDraftsOpen(true) }}
        onOpenTasks={() => setTasksOpen(true)}
        taskCount={activeTaskCount}
        onOpenSettings={() => { setTasksOpen(false); setSettingsOpen(true) }}
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
            taskPanel={
              <TaskPanel
                tasks={tasksQ.data ?? []}
                loading={tasksQ.isLoading}
                error={tasksError}
                onRetry={() => void tasksQ.refetch()}
                onCreate={addTask}
                onToggle={toggleTask}
                onDelete={removeTask}
              />
            }
          />
        }
      >
        <div className="h-full p-0 sm:p-3">
          <div className="h-full overflow-hidden rounded-none bg-white shadow-sm dark:bg-slate-900 sm:rounded-xl sm:border sm:border-slate-200 dark:sm:border-slate-800">
            <CalendarGrid
              calendarRef={calendarRef}
              events={visibleEvents}
              zoom={zoom}
              onChangeZoom={changeZoom}
              onDatesSet={onCalendarDatesSet}
              onSelect={onSelect}
              onEventClick={onEventClick}
              onEventDrop={onEventDrop}
              onEventResize={onEventResize}
              onTaskDrop={onTaskDrop}
              selectedEventId={selectedTaskEventId}
              onSelectEvent={selectTaskEvent}
              onUnscheduleEvent={(event) => {
                const raw = event.extendedProps.raw as EventRow | undefined
                if (raw) void unscheduleEvent(raw).catch(() => {})
              }}
              onSurfacePointerDown={(event) => {
                setTasksOpen(false)
                if (!(event.target as Element | null)?.closest('.chronos-event')) {
                  setSelectedTaskEventId(null)
                }
              }}
            />
          </div>
          {undoEntry && (
            <div className="chronos-undo-bar" role="status">
              <span className="truncate">已{undoEntry.label}「{undoEntry.before.title}」</span>
              <button type="button" onClick={() => { setDetails(null); void runUndo() }} disabled={undoBusy} aria-label="撤销上一步" className="shrink-0 font-semibold text-sky-600 dark:text-sky-300">
                {undoBusy ? '撤销中…' : '撤销'}<span className="ml-1 hidden text-xs sm:inline">Ctrl+Z</span>
              </button>
            </div>
          )}
        </div>
      </AppShell>

      {editor && (
        <EventEditor
          mode={editor.mode}
          initial={editor.initial}
          eventId={editor.eventId}
          version={editor.version}
          categories={categoriesQ.data ?? []}
          categoriesReady={categoriesQ.isSuccess}
          original={editor.original}
          draftId={editor.draftId}
          closeRef={editorCloseRef}
          onChanged={handleEventChanged}
          onUnschedule={unscheduleEvent}
          onClose={() => setEditor(null)}
        />
      )}

      {draftsOpen && <EventDraftList userId={user!.id} onClose={() => setDraftsOpen(false)} onSelect={draft => {
        setDraftsOpen(false)
        setEditor({ mode: 'create', draftId: draft.id, initial: { ...draft.values,
          categoryId: categoriesQ.data?.some(category => category.id === draft.values.categoryId) ? draft.values.categoryId : null,
        } })
      }} />}

      <EventDetails
        event={details}
        onClose={() => setDetails(null)}
        onEdit={() => {
          if (details) openEdit(details)
        }}
      />

      <SettingsPage open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <TaskSheet
        open={tasksOpen}
        tasks={tasksQ.data ?? []}
        loading={tasksQ.isLoading}
        error={tasksError}
        onRetry={() => void tasksQ.refetch()}
        onClose={() => setTasksOpen(false)}
        onCreate={addTask}
        onToggle={toggleTask}
        onDelete={removeTask}
      />
    </>
  )
}
