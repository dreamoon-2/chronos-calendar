import { useCallback, useRef, useState } from 'react'
import type { EventRow } from '../../types/database'
import { useToast } from '../../components/ui/Toast'
import { ConflictError, toErrorMessage } from '../../utils/errors'
import { useAuth } from '../auth/AuthProvider'
import { useInvalidateAll } from './eventQueries'
import { restoreEvent } from './eventsApi'

interface UndoEntry { before: EventRow; version: number; label: string }

export function useEventUndo() {
  const { user } = useAuth()
  const toast = useToast()
  const invalidate = useInvalidateAll()
  const entries = useRef<UndoEntry[]>([])
  const locked = useRef(false)
  const [latest, setLatest] = useState<UndoEntry | null>(null)
  const [busy, setBusy] = useState(false)

  const remember = useCallback((before: EventRow, after: EventRow, label: string) => {
    const entry = { before, version: after.version, label }
    entries.current = [...entries.current, entry].slice(-20)
    setLatest(entry)
  }, [])

  const undo = useCallback(async () => {
    const entry = entries.current.at(-1)
    if (!entry || !user || locked.current) return
    locked.current = true
    setBusy(true)
    try {
      const restored = await restoreEvent(user.id, entry.before, entry.version)
      entries.current.pop()
      // 同一日程连续撤销时，下一次使用撤销操作返回的新版本。
      const previous = [...entries.current].reverse().find((item) => item.before.id === restored.id)
      if (previous) previous.version = restored.version
      setLatest(entries.current.at(-1) ?? null)
      toast.success(`已撤销${entry.label}`)
    } catch (error) {
      if (error instanceof ConflictError) {
        entries.current.pop()
        setLatest(entries.current.at(-1) ?? null)
        toast.error('日程已在其他设备更新，无法撤销这一步，已刷新')
      } else toast.error(toErrorMessage(error))
    } finally {
      invalidate()
      locked.current = false
      setBusy(false)
    }
  }, [user, toast, invalidate])

  return { latest, busy, remember, undo }
}
