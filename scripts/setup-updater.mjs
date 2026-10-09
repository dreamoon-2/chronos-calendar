import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve, join } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = resolve(import.meta.dirname, '..')
const configFile = join(root, 'src-tauri', 'tauri.conf.json')
const config = JSON.parse(readFileSync(configFile, 'utf8'))
const privateKey = join(homedir(), '.tauri', 'chronos-calendar-updater.key')
const publicKey = `${privateKey}.pub`
if (!existsSync(privateKey)) {
  if (config.plugins.updater.pubkey) throw new Error('配置已有更新公钥。请恢复对应私钥，不能重新生成后覆盖现有更新身份。')
  mkdirSync(join(homedir(), '.tauri'), { recursive: true, mode: 0o700 })
  // CLI 输出可能包含密钥，必须捕获而不转发到终端／日志。
  const result = spawnSync(process.execPath, [join(root, 'node_modules/@tauri-apps/cli/tauri.js'), 'signer', 'generate', '--ci', '--password', '', '--write-keys', privateKey], { stdio: 'pipe' })
  if (result.status !== 0) throw new Error('生成更新签名密钥失败，CLI 输出已隐藏以保护密钥。')
}
if (!existsSync(publicKey)) throw new Error('缺少对应公钥文件，请从备份恢复。')
const key = readFileSync(publicKey, 'utf8').trim()
if (config.plugins.updater.pubkey && config.plugins.updater.pubkey !== key) throw new Error('本机公钥与应用公钥不一致，未修改配置。请使用原发布私钥。')
config.plugins.updater.pubkey = key
writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n')
console.log('更新签名已配置。私钥保存在用户目录 .tauri/chronos-calendar-updater.key，请备份并作为 GitHub Actions Secret 配置，不能提交到仓库。')
