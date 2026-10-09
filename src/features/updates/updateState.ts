export type UpdatePhase = 'idle' | 'checking' | 'latest' | 'unpublished' | 'incomplete' | 'available' | 'downloading' | 'installing' | 'restart' | 'error'
export interface UpdateState {
  phase: UpdatePhase
  version?: string
  notes?: string
  downloaded: number
  total?: number
  error?: string
}

export function updateStatusText(state: UpdateState): string {
  switch (state.phase) {
    case 'checking': return '正在检查 GitHub 新版本…'
    case 'latest': return '当前已是最新发布版本'
    case 'unpublished': return '目前尚未发布可自动更新的版本'
    case 'incomplete': return '最新版本尚未准备好自动更新包，请稍后检查'
    case 'available': return `发现新版本 v${state.version}`
    case 'downloading': return state.total ? `正在下载 ${Math.min(100, Math.round(state.downloaded / state.total * 100))}%` : `正在下载 ${(state.downloaded / 1024 / 1024).toFixed(1)} MB`
    case 'installing': return '正在安装更新，软件将重新启动…'
    case 'restart': return '更新已安装，正在重新启动…'
    case 'error': return state.error ?? '更新失败，请稍后重试'
    default: return '启动时自动检查新版本'
  }
}
