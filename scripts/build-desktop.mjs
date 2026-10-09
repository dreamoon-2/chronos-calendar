import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve, join } from 'node:path'
import { spawn } from 'node:child_process'

const root = resolve(import.meta.dirname, '..')
const env = { ...process.env }
if (!env.TAURI_SIGNING_PRIVATE_KEY) {
  const key = join(homedir(), '.tauri', 'chronos-calendar-updater.key')
  if (!existsSync(key)) throw new Error('缺少更新签名私钥。请恢复原私钥或设置 TAURI_SIGNING_PRIVATE_KEY；首次配置见 docs/AUTO_UPDATE.md。')
  env.TAURI_SIGNING_PRIVATE_KEY = key
}
env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ??= ''
const child = spawn(process.execPath, [join(root, 'node_modules/@tauri-apps/cli/tauri.js'), 'build', ...process.argv.slice(2)], { cwd: root, env, stdio: 'inherit' })
child.on('error', () => { console.error('无法启动桌面构建'); process.exitCode = 1 })
child.on('exit', (code) => { process.exitCode = code ?? 1 })
