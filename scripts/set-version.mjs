import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const version = process.argv[2]
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) throw new Error('请提供正式版本号，例如 npm run release:version -- 0.3.1')
for (const name of ['package.json', 'package-lock.json', 'src-tauri/tauri.conf.json']) {
  const file = join(root, name)
  const json = JSON.parse(readFileSync(file, 'utf8'))
  json.version = version
  if (json.packages?.['']) json.packages[''].version = version
  writeFileSync(file, JSON.stringify(json, null, 2) + '\n')
}
for (const name of ['src-tauri/Cargo.toml', 'src-tauri/Cargo.lock']) {
  const file = join(root, name)
  const source = readFileSync(file, 'utf8').replace(/(name = "chronos-calendar"\r?\nversion = ")[^"]+/, `$1${version}`)
  writeFileSync(file, source)
}
const androidFile = join(root, 'android/app/build.gradle')
let android = readFileSync(androidFile, 'utf8')
if (!android.includes(`versionName "${version}"`)) {
  android = android.replace(/versionCode (\d+)/, (_, code) => `versionCode ${Number(code) + 1}`)
    .replace(/versionName "[^"]+"/, `versionName "${version}"`)
  writeFileSync(androidFile, android)
}
console.log(`版本已统一为 ${version}。发布前请更新 CHANGELOG.md。`)
