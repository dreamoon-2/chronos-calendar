# Windows 自动更新与 GitHub 发布

更新日期：2026-10-09。自动更新从 **0.3.0 Windows 桌面版** 开始提供。

## 用户如何更新

打开软件约一秒后，在后台检查 `dreamoon-2/chronos-calendar` 的最新正式 GitHub Release。发现新版本后右下角显示提示和版本说明，点击“下载并更新”，在软件内下载、验证签名，然后安装并重新启动。设置中的“软件更新”提供手动检查与启动检查开关。

检查不需要登录日历账号。断网或 GitHub 无法访问时不阻止使用日历，稍后可以重试；检查失败不会显示“已是最新”。暂未发布 Release 和发布包尚未准备好分别显示对应状态。

正在编辑日程时先保存或关闭编辑器，之后再更新；修改过的表单已按账号保存在本机草稿中。更新不改变应用标识与数据目录，仍使用原来的登录会话、草稿和偏好。Windows 安装器可能显示安装进度或系统权限提示。

**0.2.0 及更早版本没有更新器，需要手动安装一次 0.3.0。** 此后发布的新版本才可在软件内升级。网页沿用 PWA 更新机制，Android 当前需要安装新版 APK，不执行 Windows 安装器。

## 版本来自哪里

仓库：[dreamoon-2/chronos-calendar](https://github.com/dreamoon-2/chronos-calendar)。更新端点：

```text
https://github.com/dreamoon-2/chronos-calendar/releases/latest/download/latest.json
```

更新检测针对正式 Release：草稿和预发布不提供给稳定版用户。仅提交源码、更新 README 或推送 main 不会使安装在用户电脑上的程序改变；必须提高版本号并发布已打包、已签名的安装包。

`latest.json` 包含版本号、说明、发布时间、`windows-x86_64` 安装包 URL 和签名内容。安装包与 `.sig` 必须来自同一次构建。客户端验证安装包签名及签名中的版本，拒绝不匹配的包，也不允许降级。

## 首次准备：本机已经完成的部分

本轮已生成更新签名密钥，公钥已写入 `src-tauri/tauri.conf.json`。私钥位于当前 Windows 用户目录：

```text
%USERPROFILE%\.tauri\chronos-calendar-updater.key
```

请备份私钥及同目录的 `.pub` 文件。私钥不在项目中，不能上传为 Release 附件、提交到 Git 或发送到聊天；公钥可以随源码提交。当前本机私钥密码为空，GitHub 的密码 Secret 可以省略。

`npm run updater:setup` 在已有公钥时会要求匹配的原私钥，不会自动更换更新身份。其他电脑应恢复原私钥或设置签名环境变量。发布后不能随意生成新密钥替换公钥，否则已安装的客户端将无法验证后续更新。签名密钥与 Android keystore、Windows 代码签名证书是不同用途。

## 让 GitHub 自动发布

仓库当前还没有正式 Release。项目已提供 `.github/workflows/desktop-release.yml`，需要把本轮审核后的代码、配置、公钥及工作流推送到该仓库，并完成一次 Secrets 配置。

进入仓库 **Settings → Secrets and variables → Actions → New repository secret**：

可直接打开 [本仓库 Actions Secrets 设置](https://github.com/dreamoon-2/chronos-calendar/settings/secrets/actions)。选择 **Secrets** 页签，对下面每一项填写 **Name** 与 **Secret**，点击 **Add secret**。选择 repository secret，不要建成普通 variable。

| Secret 名称 | 值 |
| --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | 本机 updater `.key` 文件的完整内容，不是路径 |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 私钥密码；当前为空，可不创建 |
| `VITE_SUPABASE_URL` | `.env.local` 中项目的 Supabase URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env.local` 中 publishable／anon key，不能用 service_role key |

在自己电脑的 PowerShell 执行下面命令，把签名私钥复制到剪贴板，再粘贴到 `TAURI_SIGNING_PRIVATE_KEY` 的 Secret 输入框。该命令不把私钥打印到终端。填写的是 `.key` 的完整内容，不能填写文件路径或 `.pub` 文件内容。

```powershell
Get-Content -LiteralPath "$env:USERPROFILE\.tauri\chronos-calendar-updater.key" -Raw | Set-Clipboard
```

用编辑器打开项目根目录 `.env.local`，找到 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`。分别复制等号右边的值，填写到同名 Secret 中，不包括变量名、等号或包裹值的引号。当前签名私钥密码为空，跳过 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`。配置完成后应看到三项必填 Secret 的名称；GitHub 不会再次显示已保存的值。

工作流缺少签名私钥或 Supabase 连接配置时会停止，避免发布无法验证或意外进入演示模式的程序。私钥仅交给签名构建步骤，不会打印内容。GitHub 发布权限使用 Actions 自带的 token。

### 首次发布当前 0.3.0

当前项目已在 `main` 分支，`origin` 已连接 `dreamoon-2/chronos-calendar`，无需重新 `git init` 或添加远程仓库。本轮修改尚未提交。先进入项目根目录并运行检查，每项通过后再进行下一步：

```powershell
cd "D:\Users\dreamoon\Documents\vibe coding\Schedule\chronos_calendar_blueprint"
npm run typecheck
npm run lint
npm run test
```

提交并推送当前全部项目改动：

```powershell
git status --short
git add -A
git diff --cached --stat
git commit -m "feat: publish 0.3.0 with desktop updater and calendar improvements"
git push origin main
```

`git add -A` 将当前修改、新增和删除都加入本次提交；`git diff --cached --stat` 供提交前核对范围。`.env.local`、更新私钥、编译缓存和本机 `release/` 已被忽略，保留在本机。首次推送如果要求登录，按提示完成 GitHub 授权。

推送 main 成功后，创建并推送版本 tag：

```powershell
git tag v0.3.0
git push origin v0.3.0
```

GitHub Actions 会检查 tag 与应用版本、安装依赖、运行 lint 和单元测试、构建签名安装包、验证真实签名及篡改拒绝、生成更新清单，最后创建正式 Release。该 Release 会包含：

```text
Chronos-Calendar_0.3.0_x64-setup.exe
Chronos-Calendar_0.3.0_x64-setup.exe.sig
latest.json
```

打开 [Actions](https://github.com/dreamoon-2/chronos-calendar/actions)，查看 **Publish Windows release**。绿色表示本次流程成功；红色时进入失败步骤查看原因。完成后打开 [Releases](https://github.com/dreamoon-2/chronos-calendar/releases)，确认 `v0.3.0` 是正式发布、包含上述三个附件。当前工作流只发布 Windows 安装包，Android APK 需单独构建。

安装一次 0.3.0 后，当前版本检查应显示已是最新。只有以后正式发布更高版本，例如 0.3.1，才会出现可下载安装的新版本提示。

本机也已准备这些文件，位于忽略的 `release/` 目录。若希望手动发布，可在 GitHub 创建对应 tag 的 Release 并同时上传上述三个文件，版本说明来自 `release/release-notes.md`。本机生成的更新 URL 已固定为该仓库与对应 tag，不要把文件发布到其他仓库后继续使用原清单。

更新附件的文件名不含空格，避免 GitHub 规范化文件名后导致下载 URL 失效。不要在已发布 Release 中替换成使用其他密钥签名的包。

## 以后发布新版本

以 0.3.1 为例，在项目根目录执行：

```powershell
npm run release:version -- 0.3.1
```

该命令同步 package、锁文件、Tauri、Cargo 与 Android 版本，并在版本改变时提高 Android versionCode。修改 `CHANGELOG.md`，在顶部加入例如下面的版本说明：

```markdown
## 0.3.1 — 实际发布日期

- 写本次新增的功能。
- 写本次修复的问题。
```

测试通过后，提交、推送源码，再推送该版本 tag：

```powershell
npm run typecheck
npm run lint
npm run test
git add -A
git diff --cached --stat
git commit -m "release: 0.3.1"
git push origin main
git tag v0.3.1
git push origin v0.3.1
```

每次命令失败时先处理原因，再运行后续命令。tag 版本必须与项目版本一致，而且必须在版本修改已提交后创建。后续发布使用递增的新版本号，不重复使用已发布的 tag。签名始终沿用首次配置的同一私钥，Secrets 通常不需要重新填写。

日常开发只想保存源码时，运行 `git add`、`git commit`、`git push origin main` 即可；推送 main 不会触发发布工作流，推送 `v*` tag 才会触发。若其他电脑或 GitHub 网页也修改了代码，应在本机没有未提交改动时先用 `git pull --ff-only origin main` 同步；推送被拒绝时先同步并处理冲突，不使用强制推送覆盖远程。

如果工作流失败，可在 Actions 修复原因后重新运行；已发布的 tag 不要覆盖成不同提交。需要重新构建同一 tag 时可手动运行工作流，并填写已存在的 tag。若该 Release 已存在，应先人工检查已有附件，不自动覆盖已分发的包。

缺少 Secret 时补齐配置后可重新运行同一失败任务；如果需要修改源码或工作流，则在新的提交中修复，并为该修复发布一个递增版本。`Missing GitHub Actions secret` 表示名称或值缺失；`Tag and application versions differ` 表示 tag 与项目版本不一致；验签失败时检查是否使用了原发布私钥。

本机打包验证：

```powershell
npm run desktop:build
npm run release:verify
npm run release:prepare
```

`desktop:build` 自动读取本机用户目录中的私钥；CI 或其他机器也可通过 `TAURI_SIGNING_PRIVATE_KEY`、`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 指定，环境文件不会自动用于签名。`release:verify` 验证实际安装包、公钥、版本，并确保篡改后的包被拒绝。`release:prepare` 生成待上传文件，不会自行上传。

## 完整验收方法

1. 手动安装包含更新器的 0.3.0，打开设置，确认启动检查开启。
2. 在 GitHub 正式发布用同一密钥签名的 0.3.1。
3. 重启 0.3.0 或点击“检查更新”，应看到 0.3.1 与版本说明。
4. 点击“下载并更新”，观察下载进度、安装与重启；顶栏应显示 0.3.1。
5. 确认原账号、日程、类型和本机草稿仍可使用。

本轮 43 项单元测试通过，本地覆盖启动检查、检查接口、失败重试、进度、签名失败不安装、重复点击和编辑器保护，验证了真实构建产物的签名及篡改拒绝。Windows 实际启动和手动检查均正确显示“尚未发布”，原生更新器 IPC 权限已验证。GitHub 线上完整升级链路需要首个正式 Release 和后续更高版本发布后验收，不能用源码提交替代这一步。

官方资料：[Tauri Updater](https://v2.tauri.app/plugin/updater/)、[GitHub Actions Secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)。
