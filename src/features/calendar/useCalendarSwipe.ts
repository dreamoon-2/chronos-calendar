import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

const HORIZONTAL_START = 12
const SWIPE_DISTANCE = 48
const SWIPE_MAX_MS = 900
const IGNORE_AFTER_SWIPE_MS = 400

interface CalendarSwipeOptions {
  /** 左滑（-1）切到更细的视图，右滑（+1）切到更粗的视图。 */
  onSwipe: (direction: 1 | -1) => void
  /** 手势开始时清理选区，避免拖选残留。 */
  onSwipeStart?: () => void
}

function hasHorizontalScrollFor(target: EventTarget | null, deltaX: number): boolean {
  let element = target instanceof HTMLElement ? target : null
  while (element) {
    const style = getComputedStyle(element)
    if (/(auto|scroll)/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 4) {
      if (deltaX < 0) return element.scrollLeft + element.clientWidth < element.scrollWidth - 4
      return element.scrollLeft > 4
    }
    element = element.parentElement
  }
  return false
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      '.chronos-event, .fc-event, button, a, input, textarea, select, [role="dialog"], [role="menu"], .chronos-selection-handle, .chronos-selection-hint, .chronos-undo-bar, .chronos-fab-stack',
    ),
  )
}

/**
 * 移动端左右滑动切换视图（年 ↔ 月 ↔ 周 ↔ 日 ↔ 日程）。
 * 只在单指、横向意图明确时接管，纵向滚动、双指缩放与事件拖拽保持原有行为。
 */
export function useCalendarSwipe(
  rootRef: RefObject<HTMLDivElement>,
  { onSwipe, onSwipeStart }: CalendarSwipeOptions,
) {
  const gesture = useRef<{
    startX: number
    startY: number
    startAt: number
    intent: 'none' | 'horizontal' | 'vertical'
  } | null>(null)
  const active = useRef(false)
  const ignoreUntil = useRef(0)
  const current = useRef({ onSwipe, onSwipeStart })
  useLayoutEffect(() => {
    current.current = { onSwipe, onSwipeStart }
  }, [onSwipe, onSwipeStart])

  const ignoresInteraction = useCallback(
    () => active.current || Date.now() < ignoreUntil.current,
    [],
  )

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const reset = () => {
      gesture.current = null
      active.current = false
    }

    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || isInteractiveTarget(event.target)) {
        gesture.current = null
        return
      }
      const touch = event.touches[0]
      gesture.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startAt: Date.now(),
        intent: 'none',
      }
    }

    const onMove = (event: TouchEvent) => {
      const state = gesture.current
      if (!state || event.touches.length !== 1) return
      const touch = event.touches[0]
      const dx = touch.clientX - state.startX
      const dy = touch.clientY - state.startY

      if (state.intent === 'none') {
        if (Math.abs(dx) < HORIZONTAL_START && Math.abs(dy) < HORIZONTAL_START) return
        if (Math.abs(dx) > Math.abs(dy) * 1.35) {
          state.intent = 'horizontal'
          active.current = true
          current.current.onSwipeStart?.()
        } else {
          state.intent = 'vertical'
          return
        }
      }
      if (state.intent !== 'horizontal') return
      // 横向浏览标记为已处理，阻止浏览器滚动与返回手势。
      if (event.cancelable) event.preventDefault()
    }

    const onEnd = (event: TouchEvent) => {
      const state = gesture.current
      reset()
      if (!state || state.intent !== 'horizontal') return
      const touch = event.changedTouches[0] ?? event.touches[0]
      if (!touch) return
      const dx = touch.clientX - state.startX
      const elapsed = Date.now() - state.startAt
      ignoreUntil.current = Date.now() + IGNORE_AFTER_SWIPE_MS
      if (elapsed > SWIPE_MAX_MS || Math.abs(dx) < SWIPE_DISTANCE) return
      if (hasHorizontalScrollFor(event.target, dx)) return
      // 等 FullCalendar 处理完本次 touchend 再切视图，避免它还在引用旧视图的 DOM。
      const direction = dx < 0 ? 1 : -1
      const swipe = current.current.onSwipe
      window.setTimeout(() => swipe(direction), 0)
    }

    const onCancel = () => {
      if (!gesture.current) return
      reset()
      ignoreUntil.current = Date.now() + 200
    }

    root.addEventListener('touchstart', onStart, { passive: true, capture: true })
    root.addEventListener('touchmove', onMove, { passive: false, capture: true })
    root.addEventListener('touchend', onEnd, { capture: true })
    root.addEventListener('touchcancel', onCancel, { capture: true })
    return () => {
      root.removeEventListener('touchstart', onStart, true)
      root.removeEventListener('touchmove', onMove, true)
      root.removeEventListener('touchend', onEnd, true)
      root.removeEventListener('touchcancel', onCancel, true)
    }
  }, [rootRef])

  return { ignoresInteraction }
}
