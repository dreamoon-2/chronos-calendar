import { supabase } from '../../services/supabaseClient'
import { demoBackend } from '../../services/demoBackend'
import type { CategoryInsert, CategoryRow } from '../../types/database'

export async function listCategories(userId: string): Promise<CategoryRow[]> {
  if (!supabase) return demoBackend.listCategories()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []) as CategoryRow[]
}

export async function createCategory(
  userId: string,
  input: CategoryInsert,
): Promise<CategoryRow> {
  if (!supabase) return demoBackend.createCategory(input)
  const { data, error } = await supabase
    .from('categories')
    .insert({ ...input, user_id: userId })
    .select('*')
    .single()
  if (error) throw error
  return data as CategoryRow
}

export async function updateCategory(
  userId: string,
  id: string,
  patch: Partial<CategoryInsert>,
): Promise<CategoryRow> {
  if (!supabase) return demoBackend.updateCategory(id, patch)
  const { data, error } = await supabase
    .from('categories')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single()
  if (error) throw error
  return data as CategoryRow
}

export async function deleteCategory(userId: string, id: string): Promise<void> {
  if (!supabase) return demoBackend.deleteCategory(id)
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}
