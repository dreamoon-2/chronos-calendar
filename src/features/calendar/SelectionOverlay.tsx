import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import type { DateSelectInfo } from '@fullcalendar/react'
import { addDays, format, startOfDay } from 'date-fns'

interface SelectionBox {
  left: number
  top: number
  width: number
  height: number
  /** 该段所属日期的本地零点；按下上下粗线时用来换算拖动后的时间。 */
  dayStartMs?: number
}

interface LaneGeometry {
  hour: number
  top: number
  height: number
  element: HTMLElement
}

function elementRect(element: HTMLElement): DOMRect | null {
  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0 ? rect : null
}

function findTimeScroller(element: HTMLElement, root: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = element
  while (current && current !== root) {
    const style = getComputedStyle(current)
    if (/(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight) {
      return current
    }
    current = current.parentElement
  }
  return null
}

/** 读取时间表的整点行位置；时间轴左侧标签宽度较小，用宽度过滤掉。 */
function readLanes(root: HTMLElement): LaneGeometry[] {
  const lanes = new Map<number, LaneGeometry>()
  for (const element of root.querySelectorAll<HTMLElement>('[data-time]')) {
    const rect = elementRect(element)
    if (!rect || rect.width < 200) continue
    const match = /^(\d{1,2}):00:00$/.exec(element.getAttribute('data-time') ?? '')
    if (!match) continue
    const hour = Number(match[1])
    const existing = lanes.get(hour)
    if (!existing || rect.width > existing.element.getBoundingClientRect().width) {
      lanes.set(hour, { hour, top: rect.top, height: rect.height, element })
    }
  }
  return [...lanes.values()].sort((a, b) => a.hour - b.hour)
}

/** 把指针的纵坐标换算成当天分钟数，超出时间表时夹到 00:00／24:00。 */
function minutesAt(clientY: number, lanes: LaneGeometry[]): number | null {
  if (lanes.length === 0) return null
  const first = lanes[0]
  const last = lanes[lanes.length - 1]
  if (clientY <= first.top) return first.hour * 60
  if (clientY >= last.top + last.height) return 24 * 60
  const lane = lanes.find((item) => clientY >= item.top && clientY <= item.top + item.height)
  if (!lane) return null
  return lane.hour * 60 + ((clientY - lane.top) / lane.height) * 60
}

function dateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function pickCell(root: HTMLElement, date: Date, timedBody: boolean): HTMLElement | null {
  const key = dateKey(date)
  const cells = [...root.querySelectorAll<HTMLElement>(`[data-date="${key}"]`)]
    .filter((cell) => cell.getAttribute('role') === 'gridcell')
    .map((cell) => ({ cell, rect: elementRect(cell) }))
    .filter((item): item is { cell: HTMLElement; rect: DOMRect } => item.rect !== null)
  if (cells.length === 0) return null
  if (timedBody) {
    return cells.sort((a, b) => b.rect.height - a.rect.height)[0].cell
  }
  // 时间表的全天栏与月／年日期格都选较小的格子，避免覆盖整个时间列。
  return cells.sort((a, b) => a.rect.height - b.rect.height)[0].cell
}

function buildBoxes(root: HTMLElement, selection: DateSelectInfo): SelectionBox[] {
  const rootRect = root.getBoundingClientRect()
  const boxes: SelectionBox[] = []
  const viewType = selection.view.type

  if (selection.allDay) {
    let cursor = startOfDay(selection.start)
    const end = startOfDay(selection.end)
    while (cursor < end) {
      const cell = pickCell(root, cursor, false)
      const rect = cell && elementRect(cell)
      if (rect) {
        boxes.push({
          left: rect.left - rootRect.left,
          top: rect.top - rootRect.top,
          width: rect.width,
          height: rect.height,
        })
      }
      cursor = addDays(cursor, 1)
    }
    return boxes
  }

  if (!viewType.startsWith('timeGrid')) return boxes

  const columns = new Map<string, DOMRect>()
  for (const cell of root.querySelectorAll<HTMLElement>('[data-date]')) {
    if (cell.getAttribute('role') !== 'gridcell') continue
    const rect = elementRect(cell)
    if (!rect || rect.height < 200) continue
    const key = cell.getAttribute('data-date')
    if (key) columns.set(key, rect)
  }

  const lanes = readLanes(root)
  if (lanes.length === 0) return boxes
  const scroller = findTimeScroller(lanes[0].element, root)
  const clip = (scroller ?? root).getBoundingClientRect()
  const yFor = (minutes: number, column: DOMRect): number | null => {
    if (minutes >= 1440) return column.bottom
    const hour = Math.floor(minutes / 60)
    const lane = lanes.find((item) => item.hour === hour)
    if (!lane) return null
    return lane.top + ((minutes % 60) / 60) * lane.height
  }

  let cursor = startOfDay(selection.start)
  while (cursor < selection.end) {
    const dayEnd = addDays(cursor, 1)
    const segmentStart = Math.max(selection.start.getTime(), cursor.getTime())
    const segmentEnd = Math.min(selection.end.getTime(), dayEnd.getTime())
    const column = columns.get(dateKey(cursor))
    if (column && segmentEnd > segmentStart) {
      const topY = yFor((segmentStart - cursor.getTime()) / 60_000, column)
      const bottomY = yFor((segmentEnd - cursor.getTime()) / 60_000, column)
      if (topY != null && bottomY != null) {
        const top = Math.max(topY, clip.top)
        const bottom = Math.min(bottomY, clip.bottom)
        const left = Math.max(column.left, clip.left)
        const right = Math.min(column.right, clip.right)
        if (bottom > top && right > left) {
          boxes.push({
            left: left - rootRect.left,
            top: top - rootRect.top,
            width: right - left,
            height: bottom - top,
            dayStartMs: cursor.getTime(),
          })
        }
      }
    }
    cursor = dayEnd
  }
  return boxes
}

interface SelectionOverlayProps {
  rootRef: RefObject<HTMLDivElement>
  selection: DateSelectInfo | null
  zoom: number
  onRangeChange: (start: Date, end: Date) => void
}

/** 在日历上绘制比原生 highlight 更明显的蓝色选区，并允许拖动上下粗线调整时间。 */
export function SelectionOverlay({ rootRef, selection, zoom, onRangeChange }: SelectionOverlayProps) {
  const [boxes, setBoxes] = useState<SelectionBox[]>([])
  const dragCleanup = useRef<(() => void) | null>(null)

  useEffect(() => () => dragCleanup.current?.(), [])
  useEffect(() => {
    if (!selection) dragCleanup.current?.()
  }, [selection])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || !selection) {
      setBoxes([])
      return
    }
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setBoxes(buildBoxes(root, selection)))
    }
    update()

    const scroller = root.querySelector<HTMLElement>('[data-time]')
    const scrollParent = scroller ? findTimeScroller(scroller, root) : null
    root.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(root)
    if (scrollParent) observer?.observe(scrollParent)

    return () => {
      cancelAnimationFrame(frame)
      root.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
      observer?.disconnect()
    }
  }, [rootRef, selection, zoom])

  const beginResize = (
    edge: 'start' | 'end',
    box: SelectionBox,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (!selection || box.dayStartMs == null) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const root = rootRef.current
    if (!root) return
    event.preventDefault()
    event.stopPropagation()
    dragCleanup.current?.()

    const startMs = selection.start.getTime()
    const endMs = selection.end.getTime()
    const dayStart = box.dayStartMs
    const dayEnd = addDays(new Date(dayStart), 1).getTime()

    const apply = (clientY: number) => {
      const lanes = readLanes(root)
      const raw = minutesAt(clientY, lanes)
      if (raw == null) return
      const minutes = Math.round(raw / 15) * 15
      if (edge === 'start') {
        const next = Math.min(
          Math.max(dayStart + minutes * 60_000, dayStart),
          endMs - 15 * 60_000,
        )
        onRangeChange(new Date(next), new Date(endMs))
      } else {
        const next = Math.max(
          Math.min(dayStart + minutes * 60_000, dayEnd),
          startMs + 15 * 60_000,
        )
        onRangeChange(new Date(startMs), new Date(next))
      }
    }

    const onMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault()
      apply(moveEvent.clientY)
    }
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      document.body.classList.remove('chronos-resizing')
      dragCleanup.current = null
    }
    const onUp = (upEvent: PointerEvent) => {
      apply(upEvent.clientY)
      cleanup()
    }
    const onCancel = () => cleanup()

    document.body.classList.add('chronos-resizing')
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    dragCleanup.current = cleanup
  }

  if (boxes.length === 0) return null
  const timed = selection != null && !selection.allDay

  return (
    <div className="chronos-selection-overlay">
      {boxes.map((box, index) => (
        <div
          key={`${box.left}-${box.top}-${index}`}
          className="chronos-selection-box"
          style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
        >
          {timed && index === 0 && (
            <button
              type="button"
              className="chronos-selection-handle chronos-selection-handle-top"
              aria-label="拖动调整开始时间"
              title="拖动调整开始时间"
              onPointerDown={(event) => beginResize('start', box, event)}
            />
          )}
          {timed && index === boxes.length - 1 && (
            <button
              type="button"
              className="chronos-selection-handle chronos-selection-handle-bottom"
              aria-label="拖动调整结束时间"
              title="拖动调整结束时间"
              onPointerDown={(event) => beginResize('end', box, event)}
            />
          )}
        </div>
      ))}
    </div>
  )
}
