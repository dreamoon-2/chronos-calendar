import { useCallback, useState } from 'react'
import type { DatesSetInfo } from '@fullcalendar/react'
import type { CalendarRange } from '../../types/database'

/** 维护日历当前可视区间、视图类型、定位日期与标题。 */
export function useCalendarRange() {
  const [range, setRange] = useState<CalendarRange | null>(null)
  const [viewType, setViewType] = useState<string>('timeGridWeek')
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date())
  const [title, setTitle] = useState<string>('')

  const handleDatesSet = useCallback((info: DatesSetInfo) => {
    setRange({ start: info.start, end: info.end })
    setViewType(info.view.type)
    setCurrentDate(info.view.currentStart)
    setTitle(info.view.title)
  }, [])

  return { range, viewType, currentDate, title, handleDatesSet }
}
