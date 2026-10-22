import { useEffect, type RefObject } from 'react'
import { Draggable } from '@fullcalendar/react/interaction'

function durationText(minutes: number): string {
  const safe = Math.max(15, Math.round(minutes / 15) * 15)
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}

/**
 * 把待办列表接入 FullCalendar 的外部拖拽：拖动时由日历绘制落点，
 * 松手后触发 eventReceive，由 CalendarPage 写入数据库。
 */
export function useTaskDraggable(containerRef: RefObject<HTMLUListElement | null>): void {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const draggable = new Draggable(container, {
      itemSelector: '.chronos-task-item--active',
      minDistance: 6,
      longPressDelay: 280,
      eventData: (item) => ({
        title: item.dataset.taskTitle ?? '待办',
        duration: durationText(Number(item.dataset.taskDuration) || 60),
        create: true,
      }),
    })
    return () => draggable.destroy()
  }, [containerRef])
}
