/**
 * 启动演示模式开发服务器：不读取 `.env.local`，因此不会连接真实 Supabase。
 * 用法：npm run dev:demo             （默认 1420）
 *      npm run dev:demo -- --port 5173
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))
const child = spawn(process.execPath, [viteBin, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, CHRONOS_DEMO: 'true' },
})
child.on('exit', (code) => process.exit(code ?? 0))
