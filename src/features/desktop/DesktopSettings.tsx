import { useEffect, useState } from 'react'
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart'
import { invoke } from '@tauri-apps/api/core'
import { platform } from '../../platform/detectPlatform'
import { useToast } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { toErrorMessage } from '../../utils/errors'
import { ensureNotificationPermission } from './eventReminders'

export function DesktopSettings() {
  const toast = useToast()
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
  return (
    <section className="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-700">
      <h3 className="text-sm font-semibold">桌面功能</h3>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" aria-label="开机启动" checked={autostart} disabled={loading || busy || !!error} onChange={(event) => void updateAutostart(event.target.checked)} />登录 Windows 后自动启动到托盘</label>
      <p className="text-sm text-slate-600 dark:text-slate-300">在每条日程的编辑器中选择「提醒此日程」和提前时间，未勾选的日程不会提醒。</p>
      <Button variant="secondary" disabled={busy} onClick={async () => {
        setBusy(true)
        try { await ensureNotificationPermission(); await invoke('test_notification'); toast.success('已发送测试通知') }
        catch (error) { toast.error(toErrorMessage(error)) }
        finally { setBusy(false) }
      }}>测试通知</Button>
      <p className="text-xs leading-relaxed text-slate-500">全天日程以当天 09:00 为提醒基准。窗口关闭到托盘后继续提醒；从托盘退出或电脑关机后停止提醒。系统通知请使用安装版测试。</p>
    </section>
  )
}
