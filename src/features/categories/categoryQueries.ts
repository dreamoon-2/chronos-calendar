import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CategoryInsert } from '../../types/database'
import { useAuth } from '../auth/AuthProvider'
import * as api from './categoriesApi'

export function useCategories() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.listCategories(user!.id),
    enabled: !!user,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: (input: CategoryInsert) => api.createCategory(user!.id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CategoryInsert> }) =>
      api.updateCategory(user!.id, id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: (id: string) => api.deleteCategory(user!.id, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['events'] })
    },
  })
}
