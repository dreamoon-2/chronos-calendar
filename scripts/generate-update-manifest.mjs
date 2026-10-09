import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const config = JSON.parse(readFileSync(join(root, 'src-tauri/tauri.conf.json'), 'utf8'))
const tag = process.env.RELEASE_TAG ?? `v${pkg.version}`
if (!/^\d+\.\d+\.\d+$/.test(pkg.version) || tag !== `v${pkg.version}` || config.version !== pkg.version) throw new Error('发布 tag、package.json 和 Tauri 版本不一致，停止生成更新清单。')
const installer = join(root, `src-tauri/target/release/bundle/nsis/Chronos Calendar_${pkg.version}_x64-setup.exe`)
if (!existsSync(installer) || !existsSync(`${installer}.sig`)) throw new Error('缺少已签名的安装包，请先运行 npm run desktop:build。')
const signature = readFileSync(`${installer}.sig`, 'utf8').trim()
if (!signature || !config.plugins?.updater?.pubkey) throw new Error('更新公钥或安装包签名为空，停止发布。')
const trusted = Buffer.from(signature, 'base64').toString('utf8').split('\n').find((line) => line.startsWith('trusted comment:'))
if (!trusted?.split('\t').includes(`version:${pkg.version}`)) throw new Error('签名中的版本与当前版本不同，停止发布。')
const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
const heading = `## ${pkg.version} `
const start = changelog.indexOf(heading)
if (start < 0) throw new Error('CHANGELOG.md 缺少当前版本说明，停止发布。')
const contentStart = changelog.indexOf('\n', start) + 1
const next = changelog.indexOf('\n## ', contentStart)
const notes = changelog.slice(contentStart, next < 0 ? undefined : next).trim()
if (!notes) throw new Error('当前版本说明不能为空。')
// 使用不含空格的发布文件名，避免 GitHub 规范化附件名导致 URL 不匹配。
const asset = `Chronos-Calendar_${pkg.version}_x64-setup.exe`
const manifest = {
  version: pkg.version,
  notes,
  pub_date: new Date().toISOString(),
  platforms: {
    'windows-x86_64': {
      signature,
      url: `https://github.com/dreamoon-2/chronos-calendar/releases/download/${tag}/${asset}`,
    },
  },
}
const output = join(root, 'release')
mkdirSync(output, { recursive: true })
copyFileSync(installer, join(output, asset))
copyFileSync(`${installer}.sig`, join(output, `${asset}.sig`))
writeFileSync(join(output, 'latest.json'), JSON.stringify(manifest, null, 2) + '\n')
writeFileSync(join(output, 'release-notes.md'), notes + '\n')
console.log(`已准备 ${tag} 发布文件：release/ 中的安装包、签名、latest.json 与版本说明。`)
