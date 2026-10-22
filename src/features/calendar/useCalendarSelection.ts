import { useEffect, useRef, useState, type RefObject } from 'react'
import type { CalendarRef, DateClickInfo, DateSelectInfo } from '@fullcalendar/react'
import { addDays, addHours, format, startOfDay, startOfHour } from 'date-fns'

/** 点击/拖动只选中，再点击原区域才创建；记录 pointerdown 前的范围，避开日历内部清选顺序。 */
export function useCalendarSelection(calendarRef: RefObject<CalendarRef>, onCreate: (info: DateSelectInfo) => void, ignoresInteraction: () => boolean) {
  const [selection, setSelection] = useState<DateSelectInfo | null>(null)
  const current = useRef<DateSelectInfo | null>(null)
  const beforePointer = useRef<DateSelectInfo | null>(null)
  const clickHandled = useRef(false)
  const syncing = useRef(false)
  const update = (info: DateSelectInfo | null) => { current.current = info; setSelection(info) }
  const clear = () => { update(null); beforePointer.current = null; calendarRef.current?.getApi().unselect() }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { current.current = null; beforePointer.current = null; setSelection(null); calendarRef.current?.getApi().unselect() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [calendarRef])
  /** 拖动选区上下粗线时更新范围，并同步 FullCalendar 的原生高亮。 */
  const setRange = (start: Date, end: Date) => {
    const base = current.current
    if (!base || base.allDay) return
    const next: DateSelectInfo = {
      ...base,
      start,
      end,
      startStr: format(start, "yyyy-MM-dd'T'HH:mm:ss"),
      endStr: end.toISOString(),
    }
    update(next)
    syncing.current = true
    try {
      calendarRef.current?.getApi().select({ start, end, allDay: false })
    } finally {
      syncing.current = false
    }
  }
  return {
    selection, clear, setRange,
    onPointerDown: () => { beforePointer.current = current.current; clickHandled.current = false },
    onUnselect: () => update(null),
    onSelect: (info: DateSelectInfo) => {
      if (ignoresInteraction()) { clear(); return }
      if (syncing.current) return
      if (!clickHandled.current) update(info)
    },
    onDateClick: (info: DateClickInfo) => {
      if (ignoresInteraction()) { clear(); return }
      clickHandled.current = true
      const previous = beforePointer.current
      if (previous && previous.allDay === info.allDay && info.date >= previous.start && info.date < previous.end) {
        clear()
        onCreate(previous)
        return
      }
      // 第一次点击默认选中点击位置所在的整点一小时（x:00–x+1:00），
      // 避免落到 15 分钟网格后还要手动改时间。
      const start = info.allDay ? startOfDay(info.date) : startOfHour(info.date)
      const end = info.allDay ? addDays(start, 1) : addHours(start, 1)
      const next: DateSelectInfo = { start, end, allDay: info.allDay,
        startStr: info.dateStr, endStr: end.toISOString(), jsEvent: info.jsEvent, view: info.view }
      update(next)
      // 在本次点击的内部清选完成后绘制持久高亮。
      queueMicrotask(() => { if (current.current === next) calendarRef.current?.getApi().select({ start: next.start, end: next.end, allDay: next.allDay }) })
    },
  }
}
