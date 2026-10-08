import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CalendarRange, EventInsert, EventUpdate } from '../../types/database'
import { useAuth } from '../auth/AuthProvider'
import * as api from './eventsApi'

export function useEventsInRange(range: CalendarRange | null) {
  const { user } = useAuth()
  const key = range ? `${range.start.toISOString()}|${range.end.toISOString()}` : 'none'
  return useQuery({
    queryKey: ['events', key],
    queryFn: () => api.listEvents(user!.id, range as CalendarRange),
    enabled: !!user && !!range,
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: (input: EventInsert) => api.createEvent(user!.id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: ({
      id,
      version,
      patch,
    }: {
      id: string
      version: number
      patch: EventUpdate
    }) => api.updateEvent(user!.id, id, version, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useSoftDeleteEvent() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      api.softDeleteEvent(user!.id, id, version),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

/** 让全部事件/分类失效并重新拉取（Realtime、焦点恢复、网络恢复共用）。 */
export function useInvalidateAll(): () => void {
  const qc = useQueryClient()
  return useCallback(() => {
    qc.invalidateQueries({ queryKey: ['events'] })
    qc.invalidateQueries({ queryKey: ['categories'] })
  }, [qc])
}
