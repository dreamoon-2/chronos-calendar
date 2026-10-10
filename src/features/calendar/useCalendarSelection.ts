import { useEffect, useRef, useState, type RefObject } from 'react'
import type { CalendarRef, DateClickInfo, DateSelectInfo } from '@fullcalendar/react'
import { addDays, addHours } from 'date-fns'

/** 点击/拖动只选中，再点击原区域才创建；记录 pointerdown 前的范围，避开日历内部清选顺序。 */
export function useCalendarSelection(calendarRef: RefObject<CalendarRef>, onCreate: (info: DateSelectInfo) => void, ignoresInteraction: () => boolean) {
  const [selection, setSelection] = useState<DateSelectInfo | null>(null)
  const current = useRef<DateSelectInfo | null>(null)
  const beforePointer = useRef<DateSelectInfo | null>(null)
  const clickHandled = useRef(false)
  const update = (info: DateSelectInfo | null) => { current.current = info; setSelection(info) }
  const clear = () => { update(null); beforePointer.current = null; calendarRef.current?.getApi().unselect() }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { current.current = null; beforePointer.current = null; setSelection(null); calendarRef.current?.getApi().unselect() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [calendarRef])
  return {
    selection, clear,
    onPointerDown: () => { beforePointer.current = current.current; clickHandled.current = false },
    onUnselect: () => update(null),
    onSelect: (info: DateSelectInfo) => {
      if (ignoresInteraction()) { clear(); return }
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
      const end = info.allDay ? addDays(info.date, 1) : addHours(info.date, 1)
      const next: DateSelectInfo = { start: info.date, end, allDay: info.allDay,
        startStr: info.dateStr, endStr: end.toISOString(), jsEvent: info.jsEvent, view: info.view }
      update(next)
      // 在本次点击的内部清选完成后绘制持久高亮。
      queueMicrotask(() => { if (current.current === next) calendarRef.current?.getApi().select({ start: next.start, end: next.end, allDay: next.allDay }) })
    },
  }
}
