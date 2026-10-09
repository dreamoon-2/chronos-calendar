import { useCallback, useState } from 'react'

const STORAGE_KEY = 'chronos.calendar.zoom'
export const MIN_ZOOM = 50
export const MAX_ZOOM = 200
export const ZOOM_STEP = 25

export function useCalendarZoom() {
  const [zoom, setZoom] = useState(() => {
    try {
      const stored = Number(localStorage.getItem(STORAGE_KEY))
      return stored >= MIN_ZOOM && stored <= MAX_ZOOM && stored % ZOOM_STEP === 0
        ? stored
        : 100
    } catch {
      return 100
    }
  })

  const changeZoom = useCallback((value: number) => {
    if (!Number.isFinite(value)) return
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value / ZOOM_STEP) * ZOOM_STEP))
    setZoom(next)
    try {
      localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // 存储不可用时仍可调整时间轴。
    }
  }, [])

  return { zoom, changeZoom }
}
