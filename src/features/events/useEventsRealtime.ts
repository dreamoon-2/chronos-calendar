import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabaseClient'
import { debounce } from '../../utils/debounce'
import { useAuth } from '../auth/AuthProvider'

/**
 * 订阅当前用户 events / categories 的 Postgres 变更。
 * 收到通知后只使相关查询失效并重取，不直接把未校验的 payload 当作权威状态。
 */
export function useEventsRealtime(): void {
  const qc = useQueryClient()
  const { user } = useAuth()

  useEffect(() => {
    if (!supabase || !user) return
    const client = supabase

    const invalidate = debounce(() => {
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
    }, 250)

    const channel = client
      .channel(`chronos-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `user_id=eq.${user.id}`,
        },
        invalidate,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `user_id=eq.${user.id}`,
        },
        invalidate,
      )
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [qc, user])
}

/** 浏览器焦点恢复与网络恢复时兜底重取；切换用户由 queryKey 之外的清理逻辑负责。 */
export function useResyncOnRecover(): void {
  const qc = useQueryClient()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    const resync = () => {
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
    }
    window.addEventListener('focus', resync)
    window.addEventListener('online', resync)
    return () => {
      window.removeEventListener('focus', resync)
      window.removeEventListener('online', resync)
    }
  }, [qc, user])
}
