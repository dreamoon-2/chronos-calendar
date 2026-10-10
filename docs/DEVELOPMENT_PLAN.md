# 开发计划与进度

按 `docs/PROJECT_SPEC.md` 第 9 节的里程碑执行。下表为当前实现状态。

当前目录和功能入口见 [项目结构说明](PROJECT_STRUCTURE.md)，文档导航见 [README](README.md)。原始规格中的目录树保留为早期设计记录。

## v0.3.1 — 2026-10-10

- 完成点击／拖选先选中、再次点击选区创建日程；鼠标、轻触、月历缩放后的日期命中、年历日期、Esc 和导航清选均已验证。
- 系统提醒改为单条日程选择与独立提前量，默认关闭，旧统一提醒开关不再生效；设置按账号保存在本机，无需修改线上数据库。
- 草稿改为主动保存，多份草稿从功能栏列表选择修改／填入；普通新建为空，关闭未保存表单可自行选择保存、放弃或继续编辑。旧版草稿兼容读取，不覆盖原日程。
- 新增响应式年视图，顺序统一为年／月／周／日；淡入切换支持系统减少动态效果偏好。修复 FullCalendar 7.1.1 在开发 StrictMode 重复挂载后丢失月／年行高观察器的问题。
- 验证通过：类型检查、ESLint、48 项单元测试、32 项桌面／移动浏览器测试；另外 6 项按平台或真实测试账号条件跳过。拖选创建的动态位置测试额外连续执行 5 次通过。
- Windows release 与 NSIS 签名打包通过，实际 Minisign 验证通过；Android release APK 的包名、版本 0.3.1（versionCode 4）及原签名证书验证通过。
- Windows 原生 v0.3.1 冒烟检查通过：年／月／周／日顺序、十二个月、空白新建、默认不提醒及草稿列表。检查没有创建、修改或删除正式账号日程。
- 产物：`release/Chronos-Calendar_0.3.1_x64-setup.exe`、`release/Chronos-Calendar_0.3.1_android.apk`。系统通知弹出和 Android 真机手势仍需按 [体验指南](FEATURE_TESTING.md) 手动验收。
- 用户已确认推送和发布；以 `v0.3.1` 标签触发双端构建，正式附件见 [GitHub Release](https://github.com/dreamoon-2/chronos-calendar/releases/tag/v0.3.1)。

| 里程碑 | 内容 | 状态 |
|---|---|---|
| M0 | Vite/React/TS/Tailwind/ESLint/tsconfig/scripts，锁定依赖，演示模式提示 | ✅ 完成 |
| M1 | 年／月／周／日视图、分类配色、全天栏、当前时间线、编辑表单、拖拽 | ✅ 完成 |
| M2 | Supabase 客户端、Auth、events/categories CRUD、RLS 迁移（SQL 已交付） | ✅ 代码完成（RLS 未在真实库验证） |
| M3 | Realtime、版本冲突、断线/前台恢复、拖拽回滚 | ✅ 代码完成（真实同步未验证） |
| M4 | vite-plugin-pwa、manifest、真实 PNG 图标、部署文档 | ✅ 完成 |
| M5 | 单元测试、RLS SQL 测试、E2E、README | ✅ 单元测试通过；RLS/E2E 需外部环境 |

## 关键实现说明

- **FullCalendar v7**：使用 `@fullcalendar/react` + `@fullcalendar/react/{daygrid,timegrid,interaction}` + `themes/classic` 主题插件；显式引入 `skeleton.css` 与主题 CSS；深色模式通过 `data-color-scheme` 切换。
- **事件映射**：`color` = 浅色底、`contrastColor` = 深色字、`eventContent` 渲染左侧色条。
- **数据层**：`eventsApi`/`categoriesApi` 内部按 `isSupabaseConfigured` 分流到 Supabase 或本地演示后端；接口与载荷一致。
- **冲突**：`updateEvent`/`softDeleteEvent` 以 `version` 为过滤条件，无返回行抛 `ConflictError`；拖拽/拉伸失败调用 `revert()`。

## 测试结果

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅（网页构建生成 PWA `sw.js`、`manifest.webmanifest`；原生构建禁用 Service Worker）
- `npm run test` ✅ 43 个单元测试全部通过（含草稿、旧版本保护、连续撤销、提醒规则和自动更新流程）
- `npm run test:e2e` ✅ 模式感知：演示模式跑创建用例；配置凭证后可用 `E2E_EMAIL`/`E2E_PASSWORD` 跑真实登录 + 创建用例
- RLS SQL 测试 ⚠️ 需在真实 Supabase 数据库执行（`supabase/tests/rls.test.sql`）

## 补充实现（按实机反馈迭代）

- **邮箱 + 密码登录**：新增注册/登录/改密，登录页可在「邮箱 + 密码」与「邮箱链接」间切换；设置页新增「账号 → 设置密码」。原因是 Supabase 内置邮件服务限制为每小时 2 封且不可调高（除非配置自定义 SMTP），魔法链接无法支撑多设备测试。
- **错误中文化**：`mapAuthError` 把 `email rate limit exceeded` / `Invalid login credentials` 等转成可读中文提示。
- **构建体积**：启用真实凭证后 Supabase SDK 不再被 tree-shake，bundle 由 554 KB 增至 767 KB（gzip 213 KB），属预期。
- **桌面端侧栏**：新增 `Sidebar.tsx`（迷你月历导航 + 分类筛选），支持收起/展开；分类筛选通过 `hiddenCategories` 过滤可视事件（无分类事件始终显示）。
- **手机 App 化**：补充 `apple-mobile-web-app-capable` / `apple-touch-icon` 等 meta，FAB 与顶栏适配 iOS 安全区（`env(safe-area-inset-*)`）。

## 跨平台（阶段推进）

### 第一阶段：Windows 桌面版（Tauri 2）✅

- 新增 `src-tauri/`（Cargo.toml、`tauri.conf.json`、`capabilities/default.json`、`src/main.rs`、`src/lib.rs`、`build.rs`）与 `tauri icon` 生成的图标集。
- 复用现有前端：`tauri.conf.json` 的 `frontendDist` 指向 `../dist`，`beforeBuildCommand` 为 `npm run build`；`identifier = com.chronos.calendar`，NSIS 安装包。
- `vite.config.ts`：Tauri 环境（`TAURI_ENV_PLATFORM`）下固定端口 1420、禁用 PWA Service Worker；Web 构建不受影响。
- `src/platform/detectPlatform.ts` 提供运行时平台检测（`isTauri` / `isCapacitor`），登录页在原生环境提示优先「邮箱 + 密码」。
- 当前 Windows 版本 0.3.1：`src-tauri/target/release/chronos-calendar.exe`（独立）+ `src-tauri/target/release/bundle/nsis/Chronos Calendar_0.3.1_x64-setup.exe`（安装包）。
- 网络：GitHub 直连超时，用 `TAURI_BUNDLER_TOOLS_GITHUB_MIRROR=https://ghfast.top` 走镜像下载 NSIS 工具链。
- **桌面增强**：系统托盘（`tray-icon`，左键唤起 + 显示/退出菜单）、关闭到托盘（`on_window_event` 拦截 `CloseRequested`，隐藏而非退出）、单实例（`tauri-plugin-single-instance`，重复启动唤起已有窗口）。

### 第二阶段：Android（Capacitor）✅

- 新增 `capacitor.config.ts`（`appId=com.chronos.calendar`、`webDir=dist`、`androidScheme=https`）与 `@capacitor/core|cli|android|app` 依赖。
- `vite.config.ts` 用 `--mode capacitor`（`npm run build:cap`）区分原生构建并禁用 PWA SW；Web 构建不受影响。
- `npx cap add android` 生成 `android/` 原生工程（AGP 8.13 / Gradle 8.14.3 / compileSdk 36）。
- 移动端适配：返回键（`@capacitor/app`，关闭弹层优先，`src/hooks/useBackButton.ts`）、`windowSoftInputMode=adjustResize`、品牌状态栏配色、安全区。
- 国内网络适配：`android/build.gradle` 用阿里云 Maven 镜像；`gradle-wrapper.properties` 用腾讯 Gradle 镜像；Android SDK 经腾讯镜像手动安装（`scripts/setup-android-sdk.ps1`）+ 写入 SDK 许可证；`buildToolsVersion=36.0.0`。
- 产物：`android/app/build/outputs/apk/debug/app-debug.apk`（4.4 MiB，含 `classes.dex` + 内嵌 web 资产）。
- **发布签名**：生成 `chronos-release.keystore` + `keystore.properties`（均 gitignore），`app/build.gradle` 配 `signingConfigs`，`assembleRelease` 产出已签名 `app-release.apk`（3.25 MiB，`apksigner verify` 通过）。生产需替换为自己的 keystore。

### 第三阶段：架构与质量 — 待办

- 前端按 `features/`、`components/`、`hooks/`、`services/`、`platform/`、`utils/` 分工；原生能力经 `src/platform/detectPlatform.ts` 门控。
- 待办：iOS（`cap add ios`，需 macOS/Xcode）、发布签名（桌面代码签名 / Android keystore）、桌面端深链回跳；Windows 自动更新已实现，正式 GitHub Release 分发仍需配置。

### 2026-10-09：时间表与结构整理

- 时间表提供 50%–200% 缩放、25% 步长、重置与本机记忆。
- 八种基础任务类型、十种主题色、自定义取色与配色预览已接入。
- 0.1.1 桌面 exe 与 NSIS 安装包已生成；顶栏显示版本。
- 演示环境桌面／手机浏览器端到端验证：10 项通过，2 项真实账号用例因缺少测试账号跳过；真实同步和 RLS 仍需独立验证。
- 原 `src/lib/` 按职责拆分；基础类型配置归入类型模块，缓存配置独立，单元测试按模块归类。
- 新增结构与功能说明、文档导航；原始规格包资料归档。Playwright 默认端口与 Vite 对齐为 1420。

### 2026-10-09：0.2.0 使用体验与桌面能力

- 保存失败保留编辑器，编辑器遮罩不关闭；按账号和日程保存／恢复本机草稿，旧版本草稿禁止覆盖新版本。
- 简洁表单和跨天／备注展开；Ctrl+Enter 保存，Esc 主动关闭。
- 删除、拖拽、拉伸和编辑支持最近 20 步撤销与 Ctrl+Z，连续撤销维护正确版本，跨设备冲突提示。
- 标题优先、长标题两行、短日程隐藏时间；悬停完整信息，周／日显示具体日期。
- 蓝色强调、白底细网格、浅色日程块及深色适配；月历缩放控件固定保留并支持行高调整。
- Ctrl+滚轮、真实双指触屏缩放保持时间锚点，修复手势松手误开编辑器。
- Windows 开机启动与通知插件、按账号提醒偏好、近三天计划刷新、原生后台提醒线程和本机通知去重。
- 新增 `docs/FEATURE_TESTING.md`，更新结构文档及 README；Windows 和 Android 版本统一为 0.2.0。
- 验证：32 项单元测试、21 项浏览器测试通过；5 项按环境跳过（3 项平台专属、2 项真实账号）。类型检查、lint、Windows release／NSIS 和 Android release 构建通过。
- Windows 原生运行验证：新版设置入口、开机启动实际开关与状态恢复、通知权限、测试通知调用、提醒线程发送与重复去重。开机启动测试后恢复为关闭；未开启正式日程提醒。系统通知实际弹出与 Android 真机体验仍需用户验收。

### 2026-10-09：0.3.0 Windows 自动更新

- 启动后在后台检查正式 GitHub Release；更新提示、版本说明、下载进度、签名验证、安装和重启已接入。设置支持手动检查、关闭启动检查及失败重试。
- 区分未发布、更新附件缺失、已是最新和网络错误；防止重复请求，开始更新前保护打开的日程编辑器。
- 本机生成更新签名密钥，私钥保存在项目外；签名中绑定版本，发布脚本同步版本并生成 `latest.json`。
- 新增 Actions 工作流：推送版本 tag 后测试、签名构建、验签并发布安装包与更新清单。首次配置见 `docs/AUTO_UPDATE.md`。
- 验证：43 项单元测试、21 项浏览器测试通过，5 项按环境跳过；类型检查、lint、Rust 检查和签名 NSIS 构建通过。真实安装包验签通过，篡改包被拒绝。
- Windows 实际启动与手动检查均返回“尚未发布”；v0.3.0 设置入口、默认启动检查和原生更新器 IPC 权限已验证。仓库尚无 Release，线上下载、安装、重启的完整升级验收需正式发布后进行。
- 本轮只重建 Windows；Android 工程版本已同步，已有 APK 仍为上一轮 0.2.0 产物。

### 2026-10-09：Windows／Android 同步发布配置

- `v0.3.0` Windows 已在 GitHub 自动发布；本轮扩展发布工作流，下一新版本在同一 Release 上传 Windows 安装包、签名、更新清单及 Android APK。
- 新增 Java 21、Android SDK、Capacitor 构建／同步、Gradle 环境变量签名与临时 keystore 清理；CI 使用官方依赖仓库与经过 SHA-256 校验的 Gradle 分发。
- 原 Android keystore 的四项 Secrets 已加密配置并确认存在，未打印密钥或密码。Windows 与 Android 签名均保留原身份。
- `android/release-signing.json` 固定旧 APK 公开证书指纹；`android:prepare` 核对 APK 实际包名、versionName、versionCode、签名后复制版本化附件。两端通过才创建 Release。
- 本机已通过与 CI 相同的环境变量签名构建，生成 Android 0.3.0（versionCode 3）；实际验签与旧版身份一致。旧版本 APK 和篡改包均被拒绝，完整发布文件已生成。
- 新工作流的 YAML、PowerShell 语法及发布条件在本机核对；完整云端流程需本轮改动提交后，推送新的正式版本 tag 验证。
- 本轮验证：43 项单元测试、类型检查和 lint 通过；工作流预检接受完整配置，拒绝缺少 Android 签名及版本不一致，CI Gradle 下载地址和校验配置转换通过。


