import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { relaunch } from '@tauri-apps/plugin-process'
import type { Update } from '@tauri-apps/plugin-updater'
import { platform } from '../../platform/detectPlatform'
import { version } from '../../../package.json'
import { Button } from '../../components/ui/Button'
import { checkForUpdate, RELEASES_URL, updateErrorMessage } from './updateService'
import { updateStatusText, type UpdateState } from './updateState'

interface UpdateContextValue {
  state: UpdateState
  busy: boolean
  supported: boolean
  automatic: boolean
  setAutomatic: (value: boolean) => void
  checkNow: () => Promise<void>
  installUpdate: () => Promise<void>
}

const AUTO_KEY = 'chronos.updater.auto'
const UpdateContext = createContext<UpdateContextValue | null>(null)
const initial: UpdateState = { phase: 'idle', downloaded: 0 }

export function SoftwareUpdateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UpdateState>(initial)
  const [automatic, setAuto] = useState(() => {
    try { return localStorage.getItem(AUTO_KEY) !== 'false' } catch { return true }
  })
  const [noticeOpen, setNoticeOpen] = useState(false)
  const update = useRef<Update | null>(null)
  const locked = useRef(false)
  const mounted = useRef(true)
  const busy = ['checking', 'downloading', 'installing', 'restart'].includes(state.phase)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (!locked.current) void update.current?.close().catch(() => undefined)
    }
  }, [])

  const checkNow = useCallback(async () => {
    if (!platform.isTauri || locked.current) return
    locked.current = true
    setState({ ...initial, phase: 'checking' })
    setNoticeOpen(false)
    try {
      await update.current?.close()
      update.current = null
      const result = await checkForUpdate()
      if (!mounted.current) {
        if (result.status === 'available') await result.update.close()
        return
      }
      if (result.status === 'available') {
        update.current = result.update
        setState({ ...initial, phase: 'available', version: result.update.version, notes: result.update.body })
        setNoticeOpen(true)
      } else setState({ ...initial, phase: result.status })
    } catch (error) {
      if (mounted.current) setState({ ...initial, phase: 'error', error: updateErrorMessage(error, '暂时无法检查更新，请检查网络后重试。') })
    } finally { locked.current = false }
  }, [])

  useEffect(() => {
    if (!platform.isTauri || !automatic) return
    // 不阻塞启动，也避免 StrictMode 的重复 effect 发起两次检查。
    const timer = window.setTimeout(() => void checkNow(), 1200)
    return () => clearTimeout(timer)
  }, [automatic, checkNow])

  const setAutomatic = useCallback((value: boolean) => {
    setAuto(value)
    try { localStorage.setItem(AUTO_KEY, String(value)) } catch { /* 本次会话仍生效。 */ }
  }, [])

  const installUpdate = useCallback(async () => {
    const next = update.current
    if (!next || locked.current) return
    if (document.querySelector('[role="dialog"][aria-label="新建日程"], [role="dialog"][aria-label="编辑日程"]')) {
      setState((previous) => ({ ...previous, error: '请先保存或关闭正在编辑的日程，再开始更新。' }))
      return
    }
    locked.current = true
    setNoticeOpen(true)
    setState((previous) => ({ ...previous, phase: 'downloading', downloaded: 0, total: undefined, error: undefined }))
    try {
      // download 会验证签名；只有成功后才交给安装器，失败时保留重试入口。
      await next.download((event) => {
        if (!mounted.current) return
        if (event.event === 'Started') setState((previous) => ({ ...previous, total: event.data.contentLength }))
        if (event.event === 'Progress') setState((previous) => ({ ...previous, downloaded: previous.downloaded + event.data.chunkLength }))
      }, { timeout: 120_000 })
      if (!mounted.current) { await next.close(); return }
      setState((previous) => ({ ...previous, phase: 'installing' }))
      await next.install({ restartAfterInstall: true })
      // Windows 安装器启动成功后原生侧会退出；其他桌面平台需要显式重启。
      if (mounted.current) setState((previous) => ({ ...previous, phase: 'restart' }))
      await relaunch()
    } catch (error) {
      if (mounted.current) setState((previous) => ({ ...previous, phase: 'error', error: updateErrorMessage(error, '下载或安装失败，请检查网络后重试。') }))
    } finally { locked.current = false }
  }, [])

  return (
    <UpdateContext.Provider value={{ state, busy, supported: platform.isTauri, automatic, setAutomatic, checkNow, installUpdate }}>
      {children}
      {platform.isTauri && noticeOpen && (
        <aside aria-label="软件更新提示" className="fixed bottom-6 right-6 z-40 w-80 max-w-[calc(100vw-48px)] rounded-xl border border-sky-200 bg-white p-4 shadow-xl dark:border-sky-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold" role="status">{updateStatusText(state)}</p>
            {!busy && <button type="button" aria-label="稍后更新" className="text-slate-400" onClick={() => setNoticeOpen(false)}>×</button>}
          </div>
          <p className="mt-1 text-xs text-slate-500">当前版本 v{version}</p>
          {state.phase === 'downloading' && <progress aria-label="更新下载进度" className="mt-3 w-full accent-sky-600" max={state.total ?? 1} value={state.total ? state.downloaded : undefined} />}
          {state.phase === 'available' && <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-slate-500">{state.notes || '此版本包含功能改进和问题修复。'}</p>}
          {state.error && state.phase !== 'error' && <p role="alert" className="mt-2 text-xs text-amber-700">{state.error}</p>}
          {state.version && !busy && <Button className="mt-3 w-full" onClick={() => void installUpdate()}>{state.phase === 'error' ? '重试更新' : '下载并更新'}</Button>}
          <a className="mt-2 inline-block text-xs text-sky-600" href={RELEASES_URL} target="_blank" rel="noreferrer">查看版本发布记录</a>
        </aside>
      )}
    </UpdateContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSoftwareUpdate() {
  const context = useContext(UpdateContext)
  if (!context) throw new Error('useSoftwareUpdate 需要 SoftwareUpdateProvider')
  return context
}
