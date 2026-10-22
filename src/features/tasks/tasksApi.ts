import { supabase } from '../../services/supabaseClient'
import { demoBackend } from '../../services/demoBackend'
import { TaskSetupError } from '../../utils/errors'
import type { TaskInsert, TaskRow, TaskUpdate } from '../../types/database'

interface PostgrestLikeError {
  code?: string
  message?: string
}

/** 把「表不存在／列不存在」翻译成可执行的迁移提示，其他错误保持原样。 */
function throwTaskError(error: PostgrestLikeError | null): never {
  const message = error?.message ?? ''
  if (
    error?.code === 'PGRST205' ||
    error?.code === 'PGRST204' ||
    /Could not find the table 'public\.tasks'/.test(message)
  ) {
    throw new TaskSetupError()
  }
  throw error
}

/** 读取当前账号的全部待办：未完成在前，新加的待办靠近顶部。 */
export async function listTasks(userId: string): Promise<TaskRow[]> {
  if (!supabase) return demoBackend.listTasks()

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('done', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throwTaskError(error)
  return (data ?? []) as TaskRow[]
}

export async function createTask(userId: string, input: TaskInsert): Promise<TaskRow> {
  if (!supabase) return demoBackend.createTask(input)
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...input, user_id: userId })
    .select('*')
    .single()
  if (error) throwTaskError(error)
  return data as TaskRow
}

export async function updateTask(
  userId: string,
  id: string,
  patch: TaskUpdate,
): Promise<TaskRow> {
  if (!supabase) return demoBackend.updateTask(id, patch)
  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle()
  if (error) throwTaskError(error)
  if (!data) throw new Error('待办已被删除，请刷新后重试')
  return data as TaskRow
}

export async function deleteTask(userId: string, id: string): Promise<void> {
  if (!supabase) {
    demoBackend.deleteTask(id)
    return
  }
  const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId)
  if (error) throwTaskError(error)
}
