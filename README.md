# Chronos Calendar

跨端同步日程表（个人日历 MVP）。React + TypeScript + Vite + FullCalendar v7 + Supabase（Auth / PostgreSQL / Realtime）+ PWA。手机与电脑使用同一套代码，通过同一账号同步日程，账户间严格隔离。

> 设计文档见 [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md)，开发任务说明见 [`docs/CODEX_CLI_PROMPT.md`](docs/CODEX_CLI_PROMPT.md)，数据库结构见 [`supabase/migrations/202610080001_initial_schema.sql`](supabase/migrations/202610080001_initial_schema.sql)。

## 功能

- 邮箱魔法链接（Magic Link）与邮箱 + 密码两种登录、注册、会话保持、退出、设置密码。
- 中文周（默认）/ 月 / 日视图，移动端额外提供“三日”紧凑视图；周一为一周开始；今天高亮、当前时间红线、上/下一段导航、跳转今天。
- 日程新增、编辑、软删除；全天事件、跨天/跨午夜事件；分类配色（浅底 + 深字 + 左侧色条）；备注；时间重叠分栏显示。
- **桌面端**：可收起的左侧栏，含迷你月历导航与分类筛选；拖拽移动与拉伸时长（失败自动 `revert()` 回滚）。
- **移动端**：以截图为准的紧凑布局 + 右下角悬浮「今天 / ＋」按钮；PWA 可安装为独立 App，含 iOS 安全区适配与桌面图标。
- 基于可视区间查询（区间重叠，不漏跨界事件），不加载全量历史。
- 乐观并发控制：`version` 条件更新，冲突时提示并刷新，绝不静默覆盖。
- Realtime 订阅 + 浏览器焦点恢复 / 网络恢复兜底重取；登出清理订阅与缓存。
- 响应式、浅色/深色、中文、离线提示、PWA 安装与更新提示。

## 技术栈

| 层 | 技术 |
|---|---|
| 构建 | Vite + React 18 + TypeScript（strict） |
| 日历 | FullCalendar React **v7**（`@fullcalendar/react` 及其 `daygrid`/`timegrid`/`interaction` 入口） |
| 样式 | Tailwind CSS 3 + 少量组件 CSS |
| 日期 | date-fns + Intl（全天用 `DATE`，分时用 `timestamptz`） |
| 状态 | TanStack Query（远端缓存）+ React Context（Auth / 主题 / Toast） |
| 后端 | Supabase Auth + PostgREST + Realtime（无自建后端） |
| 测试 | Vitest + Testing Library + Playwright；RLS 用独立 SQL 检查 |

## 快速开始

```bash
npm install
npm run dev          # 开发服务器（无凭证时进入演示模式）
npm run build        # 生产构建（含 PWA 生成）
npm run preview      # 预览生产构建
npm run lint         # ESLint
npm run typecheck    # TypeScript 严格类型检查
npm run test         # Vitest 单元测试
npm run test:e2e     # Playwright（需先 npx playwright install && npm run dev）
                     # 配置了凭证时可用 E2E_EMAIL / E2E_PASSWORD 跑真实登录用例
```

## 环境变量

复制 `.env.example` 为 `.env.local` 并填写：

```bash
VITE_SUPABASE_URL=            # 你的 Supabase Project URL
VITE_SUPABASE_PUBLISHABLE_KEY= # 你的 Supabase publishable（anon）key
VITE_DEMO_SEED=true            # 可选：演示模式是否预置示例数据
```

- 仅使用 **publishable key**，绝不把 `service_role` / secret key 放进前端。
- 两个变量都为空时，应用进入**显式标注的演示模式**（本地 `localStorage` 数据，不跨端同步、不伪称已同步）。

## 配置 Supabase（从零到可同步）

1. 在 [supabase.com](https://supabase.com) 新建项目。
2. 在 SQL Editor 中执行迁移：
   `supabase/migrations/202610080001_initial_schema.sql`
   （或使用 CLI：`supabase db push`）。它会创建 `categories`、`events` 表、索引、触发器（自动维护 `version`/`updated_at`）、RLS 策略，并把两张表加入 `supabase_realtime` publication。
3. 复制 Project Settings → API 里的 **Project URL** 与 **anon publishable key** 到 `.env.local`。
4. 配置认证邮箱：Authentication → Providers → Email 启用。并在 Authentication → URL Configuration → Redirect URLs 加入本地地址（如 `http://localhost:5173`）与正式域名。
5. 重启 `npm run dev`，使用邮箱 + 密码或邮箱链接登录，进入真实同步模式。

> 首次执行迁移前建议先在开发项目验证结构。迁移工具应管理执行版本，不要在远端反复手工执行同一迁移。

## 登录方式与邮件限额（重要）

应用提供两种登录方式，可在登录页顶部切换：

| 方式 | 说明 | 邮件配额 |
|---|---|---|
| **邮箱 + 密码**（推荐） | 注册 / 登录，多设备登录无需邮件 | 不消耗 |
| **邮箱链接** | Magic Link，点击邮件里的链接登录 | 每次消耗 1 封 |

⚠️ **Supabase 内置邮件服务限制为每小时 2 封**，且**只有配置自定义 SMTP 或 Send Email hook 才能调高**（见 [Rate limits 文档](https://supabase.com/docs/guides/auth/rate-limits)）。因此：

- 多设备测试、日常使用请用**邮箱 + 密码**，避免被限额卡住。
- 若已用魔法链接注册过账号：先登录一次，再到 **设置 → 账号 → 设置密码**，之后即可用密码登录。
- 若提示 `email rate limit exceeded`：等待约 1 小时，或改用密码登录，或在 Supabase 配置自定义 SMTP。

**仅测试想跳过邮箱确认**：Authentication → Providers → Email → 关闭 **Confirm email**，此时注册即登录、完全不发邮件（正式环境请重新打开）。

## 数据与安全要点

- **软删除**：删除是 `UPDATE events SET deleted_at = now()`，不是物理 `DELETE`；列表查询过滤 `deleted_at IS NULL`，Realtime 订阅不过滤它，以便收到删除通知。
- **版本并发**：每次更新由触发器 `version = old.version + 1`；写入带 `id + user_id + version` 过滤，无返回行即冲突。
- **RLS**：`categories`/`events` 只允许 `auth.uid() = user_id` 的读写；`anon` 无权限；事件无物理 `DELETE` 授权；复合外键阻止事件引用他人分类。
- **时区**：分时事件存 `timestamptz`，按浏览器本地时区显示；全天事件存 `DATE` 且 `end_date` 为 exclusive end。

## RLS 数据隔离测试

`supabase/tests/rls.test.sql` 用两个测试账号验证：未登录不可读、A/B 互相不可读改删、事件不可引用他人分类。需要本地 Supabase 数据库：

```bash
supabase db reset
psql "<SUPABASE_DB_URL>" -v ON_ERROR_STOP=1 -f supabase/tests/rls.test.sql
```

> 需要真实数据库；SQL 采用 `set_config('request.jwt.claims', ...)` + `set role` 模拟两个登录身份。

## 部署

- Vercel / Cloudflare Pages：构建命令 `npm run build`，输出目录 `dist`，配置 SPA fallback（`/index.html`）与 HTTPS，注入两个环境变量。
- Supabase Auth 的 Redirect URLs 需加入正式域名。
- PWA：构建时生成 `sw.js` 与 `manifest.webmanifest`，图标为真实 PNG（`public/icons/icon-{192,512}.png`）。Workbox 只缓存静态资源，**不缓存** Supabase 认证与数据请求。

## 桌面版（Windows / Tauri 2）

桌面版复用同一套 React 前端，用 Tauri 2 打包为独立 Windows 程序。**登录与同步机制完全一致**（推荐「邮箱 + 密码」登录，无需回跳；「邮箱链接」会在系统浏览器打开，不回跳回桌面程序）。

前置依赖（已具备则跳过）：

- [Rust](https://rustup.rs)（MSVC 工具链）
- [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)（“使用 C++ 的桌面开发”）
- Windows WebView2 Runtime（Win10/11 自带）

命令：

```bash
npm install
npm run desktop:dev      # 开发调试（会启动 Vite + 桌面窗口）
npm run desktop:build    # 生成安装包
```

产物：`src-tauri/target/release/chronos-calendar.exe`（独立可运行）与
`src-tauri/target/release/bundle/nsis/Chronos Calendar_0.1.0_x64-setup.exe`（安装包）。

桌面增强（已实现）：

- **系统托盘**：托盘图标（左键唤起窗口，菜单含「显示主窗口 / 退出」）。
- **关闭到托盘**：点击窗口 X 隐藏到托盘（后台继续同步），退出走托盘菜单「退出」。
- **单实例**：重复启动时唤起已有窗口，避免多开。

> ⚠️ **国内网络注意**：Tauri 打包时会从 GitHub 下载 NSIS/WiX 工具链，直连容易超时。设置镜像后重试即可：
>
> ```powershell
> $env:TAURI_BUNDLER_TOOLS_GITHUB_MIRROR = "https://ghfast.top"
> npm run desktop:build
> ```
>
> 桌面构建会通过 `TAURI_ENV_PLATFORM` 自动**禁用 PWA Service Worker**，Web 端不受影响。

## Android 版（Capacitor）

Android 版复用同一套 React 前端，用 Capacitor 打包为原生 APK。**登录与同步机制一致**（「邮箱 + 密码」直接可用；「邮箱链接」需后续接入 App Links 深链）。已适配返回键（关闭弹层优先）、软键盘 `adjustResize`、安全区、状态栏配色。

前置依赖：

- JDK 17+（本仓库当前用 JDK 24，Gradle 8.14 原生支持）
- Android SDK（`platform-tools`、`build-tools`、`platforms;android-36`）

命令：

```bash
npm install
npm run build:cap            # 以 Capacitor 模式构建（禁用 PWA SW）
npm run mobile:sync          # 复制 web 资产并同步插件
cd android && .\gradlew.bat assembleDebug    # 生成 debug APK（免签名，可直接安装）
cd android && .\gradlew.bat assembleRelease  # 生成签名 release APK
```

产物：

- debug：`android/app/build/outputs/apk/debug/app-debug.apk`
- release（已签名）：`android/app/build/outputs/apk/release/app-release.apk`

> ⚠️ **国内网络注意**：`dl.google.com` / `maven.google.com` 直连被墙，本仓库已做如下适配：
>
> 1. `android/build.gradle` 已把仓库指向**阿里云 Maven 镜像**；
> 2. `android/gradle/wrapper/gradle-wrapper.properties` 已把 Gradle 发行版指向**腾讯镜像**；
> 3. Android SDK 需手动从腾讯镜像安装（`dl.google.com` 不可达）：
>
>    ```powershell
>    # 已提供脚本 scripts/setup-android-sdk.ps1（下载 platform-36 / build-tools / platform-tools 并解压）
>    powershell -File scripts/setup-android-sdk.ps1
>    # 写入许可证（避免 AGP 因许可证未接受而失败）
>    # 已写入 %LOCALAPPDATA%\Android\Sdk\licenses\android-sdk-license
>    ```
>
> `local.properties` 已生成（指向 SDK）；如需换机器，改 `sdk.dir` 与 `android/gradle.properties` 的 `org.gradle.java.home` 即可。
>
> 发布签名已配置：`android/keystore.properties` + `android/chronos-release.keystore`（均已 gitignore）。**这是开发用 keystore，密码为示例值**；正式发布请用你自己的 `keytool` 生成新 keystore，替换这两个文件并妥善保管（丢失无法恢复签名身份）。

## 手工验收（双设备闭环）

1. 电脑与手机分别打开并登录同一账号。
2. 电脑新建日程 → 手机无需刷新即出现；手机修改 → 电脑更新；删除 → 两端消失。
3. 断开网络：界面提示“离线，无法保存”，不出现假成功。
4. 恢复网络/切回前台：自动重新拉取并收敛。
5. 两个设备同时修改同一日程：后保存的一端提示“该日程已在其他设备更新，请重新加载”，不覆盖。
6. 另一账号（或退出登录后）看不到、也改不了这些数据。

## 已知限制

- 首版不做：重复日程（RRULE）、全局搜索、导出 ICS、农历/节假日、离线可写、服务端提醒推送。
- 触屏拖拽为渐进增强；移动端优先编辑表单。
- 未配置 Supabase 时只能验证界面与本地交互，无法验证真实跨端同步与 RLS。
