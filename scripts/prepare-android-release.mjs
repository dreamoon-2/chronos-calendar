import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve, join } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = resolve(import.meta.dirname, '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const identity = JSON.parse(readFileSync(join(root, 'android/release-signing.json'), 'utf8'))
const gradle = readFileSync(join(root, 'android/app/build.gradle'), 'utf8')
const configuredVersion = gradle.match(/versionName "([^"]+)"/)?.[1]
const configuredCode = Number(gradle.match(/versionCode (\d+)/)?.[1])
if (configuredVersion !== pkg.version || (process.env.RELEASE_TAG && process.env.RELEASE_TAG !== `v${pkg.version}`)) throw new Error('Android、项目或发布 tag 版本不一致。')
if (process.argv.length > 2 && (process.argv.length !== 4 || process.argv[2] !== '--apk')) throw new Error('用法：npm run android:prepare [-- --apk APK路径]')
const apk = process.argv[3] ? resolve(process.argv[3]) : join(root, 'android/app/build/outputs/apk/release/app-release.apk')
if (!existsSync(apk)) throw new Error('缺少签名 APK，请先构建 Android release。')
const localProperties = join(root, 'android/local.properties')
const localSdk = existsSync(localProperties) ? readFileSync(localProperties, 'utf8').match(/^sdk\.dir=(.*)$/m)?.[1].trim().replace(/\\([\\:= ])/g, '$1') : undefined
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || localSdk
if (!sdk) throw new Error('找不到 Android SDK，请设置 ANDROID_HOME。')
const buildTools = gradle.match(/buildToolsVersion\s*=\s*"([^"]+)"/)?.[1]
const tools = join(sdk, 'build-tools', buildTools ?? '36.0.0')
const java = process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java'
function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 })
  if (result.error || result.status !== 0) throw new Error('Android APK 检查失败；请检查 SDK 工具、APK 完整性和签名。')
  return result.stdout
}
const certs = run(java, ['-jar', join(tools, 'lib/apksigner.jar'), 'verify', '--print-certs', apk])
const fingerprints = [...certs.matchAll(/Signer #\d+ certificate SHA-256 digest: ([a-f\d]{64})/gi)].map(match => match[1].toLowerCase())
if (fingerprints.length !== 1 || fingerprints[0] !== identity.certificateSha256.toLowerCase()) throw new Error('APK 签名与原发布证书不同，停止发布，避免旧版无法覆盖安装。')
const badging = run(join(tools, process.platform === 'win32' ? 'aapt2.exe' : 'aapt2'), ['dump', 'badging', apk])
const packageLine = badging.match(/^package:.*$/m)?.[0] ?? ''
const applicationId = packageLine.match(/name='([^']+)'/)?.[1]
const version = packageLine.match(/versionName='([^']+)'/)?.[1]
const versionCode = Number(packageLine.match(/versionCode='(\d+)'/)?.[1])
if (applicationId !== identity.applicationId || version !== pkg.version || versionCode !== configuredCode) throw new Error('APK 内部包名或版本与当前项目不一致，停止发布。')
const output = join(root, 'release')
mkdirSync(output, { recursive: true })
const asset = `Chronos-Calendar_${version}_android.apk`
copyFileSync(apk, join(output, asset))
const sha256 = createHash('sha256').update(readFileSync(apk)).digest('hex')
writeFileSync(join(output, 'android-release.json'), JSON.stringify({ asset, version, versionCode, applicationId, certificateSha256: fingerprints[0], sha256 }, null, 2) + '\n')
console.log(`Android APK 已验签：v${version}（${versionCode}），包名与原签名一致。已准备 release/${asset}`)
