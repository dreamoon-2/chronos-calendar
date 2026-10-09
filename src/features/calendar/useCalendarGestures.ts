import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import type { CalendarRef } from '@fullcalendar/react'
import { MAX_ZOOM, MIN_ZOOM } from './useCalendarZoom'

export function findTimeScroller(root: HTMLElement): HTMLElement | null {
  let element = root.querySelectorAll<HTMLElement>('[data-time="09:00:00"]')
    .item(root.querySelectorAll('[data-time="09:00:00"]').length - 1)
  while (element && element !== root) {
    if (/(auto|scroll)/.test(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight) return element
    element = element.parentElement as HTMLElement
  }
  return null
}

export function useCalendarGestures(rootRef: RefObject<HTMLDivElement>, calendarRef: RefObject<CalendarRef>, zoom: number, onZoom: (value: number) => void) {
  const previousZoom = useRef(zoom)
  const anchor = useRef<{ hour: number; offset: number } | null>(null)
  const [pinching, setPinching] = useState(false)
  const gestureActive = useRef(false)
  const ignoreUntil = useRef(0)
  const ignoresInteraction = useCallback(() => gestureActive.current || Date.now() < ignoreUntil.current, [])
  const current = useRef({ zoom, onZoom })
  useLayoutEffect(() => { current.current = { zoom, onZoom } }, [zoom, onZoom])

  useLayoutEffect(() => {
    const root = rootRef.current
    const scroller = root && findTimeScroller(root)
    if (zoom === previousZoom.current) return
    const saved = anchor.current ?? (scroller ? { hour: scroller.scrollTop / (64 * previousZoom.current / 100), offset: 0 } : null)
    previousZoom.current = zoom
    anchor.current = null
    if (!saved || !scroller) return
    let secondFrame = 0
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        const top = Math.max(0, saved.hour * (64 * zoom / 100) - saved.offset)
        calendarRef.current?.getApi().scrollToTime({ milliseconds: top / (64 * zoom / 100) * 3_600_000 })
      })
    })
    return () => { cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame) }
  }, [zoom, calendarRef, rootRef])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const saveAnchor = (clientY: number) => {
      const scroller = findTimeScroller(root)
      if (!scroller) return false
      const offset = Math.max(0, Math.min(scroller.clientHeight, clientY - scroller.getBoundingClientRect().top))
      anchor.current = { hour: (scroller.scrollTop + offset) / (64 * current.current.zoom / 100), offset }
      return true
    }
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey || !saveAnchor(event.clientY)) return
      event.preventDefault()
      event.stopPropagation()
      current.current.onZoom(current.current.zoom + (event.deltaY < 0 ? 25 : -25))
    }
    let pinch: { distance: number; zoom: number } | null = null
    const distance = (touches: TouchList) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)
    const start = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !saveAnchor((event.touches[0].clientY + event.touches[1].clientY) / 2)) return
      event.preventDefault()
      event.stopPropagation()
      calendarRef.current?.getApi().unselect()
      gestureActive.current = true
      pinch = { distance: distance(event.touches), zoom: current.current.zoom }
      setPinching(true)
    }
    const move = (event: TouchEvent) => {
      if (!pinch || event.touches.length !== 2) return
      event.preventDefault()
      event.stopPropagation()
      saveAnchor((event.touches[0].clientY + event.touches[1].clientY) / 2)
      current.current.onZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinch.zoom * distance(event.touches) / pinch.distance)))
    }
    const end = (event: TouchEvent) => {
      if (!gestureActive.current) return
      event.preventDefault()
      event.stopPropagation()
      if (event.touches.length > 0) return
      pinch = null
      gestureActive.current = false
      ignoreUntil.current = Date.now() + 450
      setPinching(false)
    }
    root.addEventListener('wheel', onWheel, { passive: false })
    root.addEventListener('touchstart', start, { passive: false, capture: true })
    root.addEventListener('touchmove', move, { passive: false, capture: true })
    root.addEventListener('touchend', end, { passive: false, capture: true })
    root.addEventListener('touchcancel', end, { passive: false, capture: true })
    return () => {
      root.removeEventListener('wheel', onWheel)
      root.removeEventListener('touchstart', start, true)
      root.removeEventListener('touchmove', move, true)
      root.removeEventListener('touchend', end, true)
      root.removeEventListener('touchcancel', end, true)
    }
  }, [rootRef, calendarRef])
  return { pinching, ignoresInteraction }
}
