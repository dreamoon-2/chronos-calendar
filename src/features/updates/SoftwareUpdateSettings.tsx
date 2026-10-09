import { version } from '../../../package.json'
import { Button } from '../../components/ui/Button'
import { RELEASES_URL } from './updateService'
import { useSoftwareUpdate } from './SoftwareUpdateProvider'
import { updateStatusText } from './updateState'

export function SoftwareUpdateSettings() {
  const { state, busy, supported, automatic, setAutomatic, checkNow, installUpdate } = useSoftwareUpdate()
  if (!supported) return null
  return (
    <section className="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-700">
      <h3 className="text-sm font-semibold">软件更新</h3>
      <p className="text-xs text-slate-500">当前版本 v{version} · Windows 桌面版</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" aria-label="启动时检查更新" checked={automatic} disabled={busy} onChange={(event) => setAutomatic(event.target.checked)} />打开软件时自动检查 GitHub 新版本</label>
      <p role="status" className={`text-sm ${state.phase === 'error' ? 'text-red-600' : 'text-slate-500 dark:text-slate-400'}`}>{updateStatusText(state)}</p>
      {state.phase === 'downloading' && <progress aria-label="更新下载进度" className="w-full accent-sky-600" max={state.total ?? 1} value={state.total ? state.downloaded : undefined} />}
      {state.version && <div className="max-h-40 overflow-y-auto rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800"><p className="mb-1 font-semibold">v{state.version} 版本说明</p><p className="whitespace-pre-wrap">{state.notes || '此版本包含功能改进和问题修复。'}</p></div>}
      <div className="flex items-center gap-2">
        <Button variant="secondary" disabled={busy} onClick={() => void checkNow()}>检查更新</Button>
        {state.version && <Button disabled={busy} onClick={() => void installUpdate()}>{state.phase === 'error' ? '重试更新' : '下载并更新'}</Button>}
      </div>
      <p className="text-xs leading-relaxed text-slate-500">更新包下载并验证后安装，完成后重新启动软件。请先保存正在编辑的日程。</p>
      <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="text-xs text-sky-600">GitHub 版本发布记录</a>
    </section>
  )
}
