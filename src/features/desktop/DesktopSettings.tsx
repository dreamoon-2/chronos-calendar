import { useEffect, useState } from 'react'
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart'
import { isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification'
import { invoke } from '@tauri-apps/api/core'
import { platform } from '../../platform/detectPlatform'
import { useToast } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { toErrorMessage } from '../../utils/errors'
import { useAuth } from '../auth/AuthProvider'
import { setDesktopPreferences, useDesktopPreferences } from './desktopPreferences'

export function DesktopSettings() {
  const { user } = useAuth()
  const toast = useToast()
  const preferences = useDesktopPreferences(user?.id ?? '')
  const [autostart, setAutostart] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!platform.isTauri) return
    isEnabled().then(setAutostart).catch((error) => setError(toErrorMessage(error))).finally(() => setLoading(false))
  }, [])
  if (!platform.isTauri) return (
    <section className="border-t border-slate-200 pt-5 dark:border-slate-700">
      <h3 className="text-sm font-semibold">桌面功能</h3>
      <p className="mt-2 text-xs text-slate-500">安装 Windows 桌面版后，可设置开机启动与系统日程提醒。</p>
    </section>
  )
  const updateAutostart = async (checked: boolean) => {
    setBusy(true)
    try {
      if (checked) await enable()
      else await disable()
      setAutostart(await isEnabled())
      toast.success(checked ? '已设置登录 Windows 后启动到托盘' : '已关闭开机启动')
    } catch (error) { toast.error(toErrorMessage(error)) }
    finally { setBusy(false) }
  }
  const updateReminders = async (checked: boolean) => {
    setBusy(true)
    try {
      if (checked && !await isPermissionGranted() && await requestPermission() !== 'granted') throw new Error('系统未允许通知，请在 Windows 通知设置中开启 Chronos')
      setDesktopPreferences(user!.id, { reminders: checked })
    } catch (error) { toast.error(toErrorMessage(error)) }
    finally { setBusy(false) }
  }
  return (
    <section className="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-700">
      <h3 className="text-sm font-semibold">桌面功能</h3>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" aria-label="开机启动" checked={autostart} disabled={loading || busy || !!error} onChange={(event) => void updateAutostart(event.target.checked)} />登录 Windows 后自动启动到托盘</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" aria-label="日程提醒" checked={preferences.reminders} disabled={busy} onChange={(event) => void updateReminders(event.target.checked)} />日程开始前发送系统提醒</label>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">提醒时间<select aria-label="提前提醒时间" value={preferences.leadMinutes} disabled={busy} onChange={(event) => {
          try { setDesktopPreferences(user!.id, { leadMinutes: Number(event.target.value) }) } catch (error) { toast.error(toErrorMessage(error)) }
        }} className="rounded-lg border border-slate-200 bg-transparent px-2 py-1 dark:border-slate-700">{[0, 5, 10, 15, 30].map((minutes) => <option key={minutes} value={minutes}>{minutes === 0 ? '开始时' : `提前 ${minutes} 分钟`}</option>)}</select></label>
        <Button variant="secondary" disabled={busy} onClick={() => {
          void invoke('test_notification').then(() => toast.success('已发送测试通知')).catch((error) => toast.error(toErrorMessage(error)))
        }}>测试通知</Button>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">全天日程以当天 09:00 为提醒基准。窗口关闭到托盘后继续提醒；从托盘退出或电脑关机后停止提醒。系统通知请使用安装版测试。</p>
    </section>
  )
}
