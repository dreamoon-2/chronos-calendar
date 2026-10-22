import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TaskInsert, TaskUpdate } from '../../types/database'
import { useAuth } from '../auth/AuthProvider'
import { softDeleteEvent } from '../events/eventsApi'
import * as api from './tasksApi'

export const TASKS_QUERY_KEY = ['tasks'] as const

export function useTasks() {
  const { user } = useAuth()
  return useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: () => api.listTasks(user!.id),
    enabled: !!user,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: (input: TaskInsert) => api.createTask(user!.id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TaskUpdate }) =>
      api.updateTask(user!.id, id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: (id: string) => api.deleteTask(user!.id, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  })
}

/** 把已排入时间表的待办收回清单：软删除关联日程，并把待办恢复为未完成。 */
export function useUnscheduleTaskEvent() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ eventId, version, taskId }: { eventId: string; version: number; taskId: string }) => {
      const event = await softDeleteEvent(user!.id, eventId, version)
      await api.updateTask(user!.id, taskId, { done: false })
      return event
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY })
    },
  })
}
