# Chronos Calendar：项目结构与功能说明

更新日期：2026-10-10。当前版本：0.3.1。

这是一个已实现的个人日程应用。网页、Windows 桌面程序和 Android 应用共用 `src/` 下的 React 前端；配置 Supabase 后，通过账号同步日程。未配置凭证时，使用明确标注的本地演示模式。

## 1. 从哪里开始

| 想做什么 | 查看哪里 |
| --- | --- |
| 启动项目、配置账号、打包安装程序 | [根目录 README](../README.md) |
| 了解日历页面如何组合 | [CalendarPage.tsx](../src/features/calendar/CalendarPage.tsx) |
| 修改时间表布局、拖拽与时间格 | [CalendarGrid.tsx](../src/features/calendar/CalendarGrid.tsx) |
| 修改缩放按钮和范围 | [CalendarToolbar.tsx](../src/features/calendar/CalendarToolbar.tsx)、[useCalendarZoom.ts](../src/features/calendar/useCalendarZoom.ts) |
| 修改新建／编辑任务表单 | [EventEditor.tsx](../src/features/events/EventEditor.tsx) |
| 修改草稿与撤销 | [eventDrafts.ts](../src/features/events/eventDrafts.ts)、[useEventUndo.ts](../src/features/events/useEventUndo.ts) |
| 修改手势缩放与时间定位 | [useCalendarGestures.ts](../src/features/calendar/useCalendarGestures.ts) |
| 修改桌面启动与提醒 | [DesktopSettings.tsx](../src/features/desktop/DesktopSettings.tsx)、[reminders.rs](../src-tauri/src/reminders.rs) |
| 修改自动更新与发布 | [SoftwareUpdateProvider.tsx](../src/features/updates/SoftwareUpdateProvider.tsx)、[AUTO_UPDATE.md](AUTO_UPDATE.md) |
| 修改基础任务类型 | [categoryPresets.ts](../src/features/categories/categoryPresets.ts) |
| 修改主题色和颜色计算 | [colors.ts](../src/utils/colors.ts)、[ColorPicker.tsx](../src/components/ui/ColorPicker.tsx) |
| 修改设置界面 | [SettingsPage.tsx](../src/features/settings/SettingsPage.tsx) |
| 查看数据库定义与权限 | [数据库迁移](../supabase/migrations/202610080001_initial_schema.sql) |
| 查看项目进度与待办 | [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) |

## 2. 总体目录

下表和目录树展示需要维护的文件；图标变体、原生工程生成文件及依赖内部文件作了省略。

```text
chronos_calendar_blueprint/
├── README.md                      # 项目总入口：使用、配置、测试、打包
├── docs/                          # 项目说明、设计与历史资料
│   ├── README.md                   # 文档导航
│   ├── PROJECT_STRUCTURE.md        # 本文：当前结构与功能
│   ├── FEATURE_TESTING.md          # 新功能体验与测试步骤
│   ├── AUTO_UPDATE.md              # 自动更新、签名与发布步骤
│   ├── DEVELOPMENT_PLAN.md         # 进度、验证记录、待办
│   ├── PROJECT_SPEC.md             # 初始产品与技术设计
│   └── archive/                    # 原始规格包资料
│       ├── BLUEPRINT_README.md
│       └── CODEX_CLI_PROMPT.md
├── src/                           # Web／Windows／Android 共用前端
│   ├── main.tsx                    # React 入口，加载全局样式
│   ├── app/                        # 应用装配、主题和缓存配置
│   ├── features/                   # 按业务功能组织的页面与数据操作
│   │   ├── auth/                   # 登录、注册、会话与密码
│   │   ├── calendar/               # 日历页面、时间表、缩放与筛选
│   │   ├── events/                 # 日程表单、校验、增删改查与同步
│   │   ├── categories/             # 任务类型预设与类型数据操作
│   │   ├── desktop/                # Windows 开机启动、通知设置与提醒计划
│   │   ├── updates/                # 桌面启动检查、下载进度与安装更新
│   │   └── settings/               # 类型管理与账号设置
│   ├── components/                 # 可复用界面组件
│   │   ├── layout/                 # 应用外壳与顶栏
│   │   └── ui/                     # 按钮、弹窗、提示、取色器
│   ├── hooks/                      # 跨功能复用的 React Hook
│   ├── services/                   # Supabase 客户端与演示后端
│   ├── platform/                   # Web／Tauri／Capacitor 平台检测
│   ├── utils/                      # 日期、颜色、错误和去抖工具
│   ├── types/                      # 共享数据类型
│   ├── styles/                     # 全局与日历样式
│   └── vite-env.d.ts               # Vite 环境类型
├── public/icons/                  # PWA 图标与原生图标源图
├── tests/                         # 前端自动化测试
│   ├── setup.ts                    # 单元测试初始化
│   ├── unit/
│   │   ├── features/events/        # 表单校验和日程映射测试
│   │   ├── features/desktop/       # 提醒时间、全天与过期日程测试
│   │   ├── services/               # 演示后端测试
│   │   └── utils/                  # 日期边界与区间测试
│   └── e2e/                        # 桌面／手机浏览器交互测试
├── supabase/                      # 云端数据库工程
│   ├── migrations/                # 表、索引、触发器、RLS 与 Realtime
│   └── tests/                     # 数据权限隔离 SQL 测试
├── src-tauri/                     # Windows 原生工程
│   ├── src/                        # Rust 入口、托盘、窗口与原生提醒线程
│   ├── icons/                      # 原生图标集
│   ├── capabilities/              # Tauri 权限声明
│   ├── build.rs                    # Rust 构建入口
│   ├── Cargo.toml / Cargo.lock      # Rust 依赖与锁文件
│   └── tauri.conf.json             # 窗口、版本、网页资源与安装包配置
├── android/                       # Capacitor Android 原生工程
│   ├── app/src/main/               # Activity、Manifest、资源
│   ├── app/build.gradle            # 应用构建与签名配置
│   ├── release-signing.json        # 原 Android 发布证书公开指纹，保证覆盖安装兼容
│   ├── gradle/                     # Gradle Wrapper 配置
│   └── ...                         # Gradle／Capacitor 工程文件
├── scripts/                       # 图标、SDK、更新签名配置、版本与发布工具
├── .github/workflows/             # 推送版本 tag 后构建并发布 Windows／Android
├── CHANGELOG.md                   # 每个正式版本的更新说明
├── .env.example                   # 环境变量示例
├── .gitignore / .gitattributes      # 忽略规则与文件属性
├── package.json / package-lock.json # 前端依赖、版本和命令
├── index.html                     # 网页入口与安装相关 meta
├── vite.config.ts                 # Web／桌面／Android 构建和 PWA
├── capacitor.config.ts            # Android App ID 与网页资源目录
├── tsconfig*.json                 # TypeScript 编译配置
├── tailwind.config.cjs             # 主题与 Tailwind 扫描路径
├── postcss.config.cjs              # CSS 构建处理
├── eslint.config.js               # 代码检查
├── vitest.config.ts               # 单元测试配置
└── playwright.config.ts           # 浏览器交互测试配置
```

根目录保留工具默认读取的配置文件，避免为了减少文件数量而增加路径配置。Windows 和 Android 原生目录也保留各自工具的标准位置。

## 3. 前端文件与职责

### 应用与公共组件

| 目录 | 主要文件 | 功能 |
| --- | --- | --- |
| `src/app/` | `App.tsx`、`providers.tsx` | 装配缓存、主题、提示和认证；账号切换时清空旧缓存 |
| `src/app/` | `routes.tsx` | 根据会话状态显示加载页、登录页或日历；目前是条件切换，没有 URL 路由库 |
| `src/app/` | `queryClient.ts` | 配置查询重试、缓存有效期与焦点恢复刷新 |
| `src/app/` | `theme.tsx` | 深浅色切换、本机记忆与 FullCalendar 主题属性 |
| `src/components/layout/` | `AppShell.tsx`、`Header.tsx` | 页面布局、顶栏版本号、侧栏区域、离线／演示提示、移动端浮动按钮 |
| `src/components/ui/` | `Button.tsx`、`Modal.tsx`、`Toast.tsx` | 通用按钮、桌面弹窗／手机抽屉、操作结果提示 |
| `src/components/ui/` | `ColorPicker.tsx` | 主题色板、自定义取色、当前色值和配色预览 |

### 业务功能

| 模块 | 主要文件 | 功能 |
| --- | --- | --- |
| `features/auth/` | `LoginPage.tsx` | 邮箱密码登录／注册、邮件链接登录与原生平台提示 |
| `features/auth/` | `AuthProvider.tsx`、`authService.ts` | 会话获取与监听、退出、密码修改、认证错误中文化 |
| `features/calendar/` | `CalendarPage.tsx` | 组合日历、侧栏、日程弹窗与设置；处理点击、选择、拖拽、拉伸及失败回滚 |
| `features/calendar/` | `CalendarGrid.tsx` | FullCalendar 年／月／周／日视图、淡入切换、全天栏、当前时间线和 15 分钟拖拽对齐 |
| `features/calendar/` | `CalendarToolbar.tsx` | 日期导航、视图切换、添加日程与缩放控件 |
| `features/calendar/` | `CalendarEventCard.tsx` | 标题优先、最多两行，短日程隐藏时间，悬停完整信息和任务类型色条 |
| `features/calendar/` | `Sidebar.tsx` | 桌面迷你月历、跳转日期、任务类型筛选 |
| `features/calendar/` | `useCalendarRange.ts` | 维护当前可视日期范围、视图、标题与定位日期 |
| `features/calendar/` | `useCalendarZoom.ts` | 50%–200% 时间轴缩放，25% 步长、重置与本机记忆 |
| `features/calendar/` | `useCalendarGestures.ts` | Ctrl+滚轮／双指缩放、保留时间锚点、抑制手势误点击 |
| `features/calendar/` | `useCalendarSelection.ts` | 点击／拖选先选中、再次点击确认创建；导航、切换视图、Esc 清选 |
| `features/events/` | `EventEditor.tsx`、`EventDetails.tsx` | 简洁表单、失败保留、关闭保存选择、逐条提醒、跨天与备注展开 |
| `features/events/` | `eventDrafts.ts`、`EventDraftList.tsx` | 按账号保存多份草稿、兼容旧草稿、列表选择修改与填入；普通新建不自动恢复 |
| `features/events/` | `useEventUndo.ts` | 最近 20 步撤销，恢复软删除和修改前数据，处理连续撤销版本及冲突 |
| `features/events/` | `eventSchema.ts` | 表单默认值、标题与时间校验、表单／数据库载荷转换 |
| `features/events/` | `eventMappers.ts` | 数据库日程转换为 FullCalendar 事件，并附带主题色和版本 |
| `features/events/` | `eventsApi.ts`、`eventQueries.ts` | 按时间区间查询、创建、版本条件更新、软删除与缓存刷新 |
| `features/events/` | `useEventsRealtime.ts` | 订阅云端日程与类型变化；网络／焦点恢复时重新查询 |
| `features/categories/` | `categoryPresets.ts` | 八种基础任务类型及其默认主题色 |
| `features/categories/` | `categoriesApi.ts`、`categoryQueries.ts` | 类型的读取、创建、改名、改色、删除和缓存刷新 |
| `features/settings/` | `SettingsPage.tsx` | 添加基础／自定义类型、主题色管理、登录邮箱与密码设置 |
| `features/desktop/` | `DesktopSettings.tsx` | 原生开机启动开关、逐条提醒使用说明、通知权限与测试通知 |
| `features/desktop/` | `eventReminders.ts` | 按账号和日程 ID 保存本机提醒提前量，检查通知权限；未选择则不提醒 |
| `features/desktop/` | `reminderSchedule.ts`、`useDesktopReminders.ts` | 查询今起三天日程，每分钟刷新，将提醒计划交给原生后台 |
| `features/updates/` | `SoftwareUpdateProvider.tsx` | 启动检查、更新提示、下载／安装状态、编辑器保护与失败重试 |
| `features/updates/` | `SoftwareUpdateSettings.tsx`、`updateState.ts` | 设置入口、启动检查偏好、版本说明与进度文字 |
| `features/updates/` | `updateService.ts` | GitHub Release 状态查询与 Tauri Updater 调用 |

### 服务、Hook、平台与工具

| 文件 | 功能 |
| --- | --- |
| `src/services/supabaseClient.ts` | 读取环境变量并创建 Supabase 客户端；决定是否进入演示模式 |
| `src/services/demoBackend.ts` | 本机演示数据、示例播种、类型与日程 CRUD、软删除与版本冲突模拟 |
| `src/hooks/useOnlineStatus.ts` | 监听浏览器联网／离线事件 |
| `src/hooks/useBackButton.ts` | Android 返回键优先关闭弹层，没有弹层时退出 |
| `src/platform/detectPlatform.ts` | 检测 Web、Tauri 桌面和 Capacitor 原生平台 |
| `src/utils/dates.ts` | 本地日期与时间转换、日期显示、区间重叠、全天结束日期转换 |
| `src/utils/colors.ts` | 十种预设主题色、默认色、浅底与深色文字的计算 |
| `src/utils/errors.ts` | 版本冲突错误与通用错误提示转换 |
| `src/utils/debounce.ts` | 合并频繁调用，供实时同步缓存刷新使用 |
| `src/types/database.ts` | 日程、任务类型、写入载荷与查询区间的 TypeScript 类型 |
| `src/styles/globals.css` | Tailwind 入口、基础样式和安全区 |
| `src/styles/calendar.css` | 日程卡片、类型色条与今日高亮样式 |

## 4. 一次日程操作如何流转

1. 用户在 `CalendarPage` 点击日期或添加按钮，打开 `EventEditor`。
2. `eventSchema` 校验表单，并转换成数据库写入载荷。
3. `eventQueries` 通过 TanStack Query 发起写入，调用 `eventsApi`。
4. 有 Supabase 客户端时写入云端；没有时转交 `demoBackend`，写入本机演示数据。
5. 成功后使相关查询缓存失效，重新查询当前时间范围。
6. `eventMappers` 将结果与类型配色一起转换成 FullCalendar 事件，更新日历。

云端变化通过 Realtime 触发重新查询；拖拽与拉伸直接调用事件 API，并在失败时撤销界面上的移动。编辑与删除带上 `version`，避免静默覆盖其他设备的新修改。

编辑器只在用户主动点击「保存草稿」或关闭时选择保存后写入本机草稿库。新建／编辑不自动填入旧草稿，从功能栏「日程草稿」手动选择后可修改并创建新日程，成功后移除对应草稿；旧草稿不会覆盖现有日程。成功修改／删除记录到撤销栈，撤销通过相同版本条件恢复原记录，不创建重复日程。系统提醒按单条日程在当前设备选择，无需数据库迁移。

桌面提醒计划由前端查询近期日程生成，Rust `reminders.rs` 每 10 秒检查到期项；通知成功后记录去重键。窗口隐藏到托盘仍运行原生线程；退出后停止。开机启动通过 Tauri 插件注册当前安装程序，并传入 `--autostart` 隐藏启动。

基础类型预设并不是数据库列上的固定枚举。选择缺少的基础类型时会创建一条类型记录；已存在的同名类型使用用户当前配色。修改类型主题色会影响该类型的所有日程。

## 5. 数据保存位置

| 内容 | 保存位置 | 是否跨设备 |
| --- | --- | --- |
| 真实账号的日程与类型 | Supabase 的 `events`、`categories` 表 | 同账号联网时同步 |
| 演示日程与类型 | `localStorage`，键 `chronos.demo.v1` | 否 |
| 深浅色偏好 | `localStorage`，键 `chronos.theme` | 否 |
| 时间轴缩放比例 | `localStorage`，键 `chronos.calendar.zoom` | 否 |
| 主动保存的草稿 | `localStorage`，键 `chronos.drafts.<账号>`；旧 `chronos.draft.*` 兼容读取 | 否，可在草稿列表删除或填入后提交 |
| 撤销历史 | 当前日历页面内存，最近 20 步 | 否，刷新／退出清除 |
| 单条日程提醒 | `localStorage`，键 `chronos.event-reminders.<账号>`，按日程 ID 保存提前分钟数 | 否，浏览器／Windows／Android 分别保存 |
| 启动检查更新偏好 | `localStorage`，键 `chronos.updater.auto` | 否，默认开启 |
| 通知去重记录 | Tauri 本机配置目录的 `delivered-reminders.json` | 否 |
| 开机启动 | Windows 当前用户的启动注册项，由 Tauri 插件管理 | 否 |
| 当前查询结果 | TanStack Query 内存缓存 | 否，刷新后重新查询 |
| 登录会话 | Supabase 客户端在当前运行环境中持久化 | 各设备分别登录 |

分时日程保存为时间戳，按运行设备的本地时区显示。全天事件保存为日期，数据库的结束日期不包含当天；表单中的结束日期包含当天，由转换函数处理。

`.env.local` 是本机连接配置；Android 的 `local.properties`、签名配置和 keystore 是本机工程配置。这些文件已由忽略规则排除，不应作为共享源码提交。

## 6. 开发、测试与构建

下面的 npm 命令从项目根目录运行。

| 命令 | 用途与输出 |
| --- | --- |
| `npm install` | 安装前端依赖到 `node_modules/` |
| `npm run dev` | 启动网页开发服务器，默认 `http://localhost:1420` |
| `npm run desktop:dev` | 启动 Tauri 开发窗口，查看源码实时更新 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | ESLint 检查 |
| `npm run test` | 运行 `tests/unit/` 下的单元测试 |
| `npm run test:e2e` | 浏览器交互测试；先启动开发服务器，默认连接 1420 端口 |
| `npm run build` | 网页生产构建到 `dist/`，生成 PWA 资源 |
| `npm run desktop:build` | 重新构建前端并生成 Windows exe、签名 NSIS 安装包与 `.sig` |
| `npm run updater:setup` | 配置更新签名公钥，要求保留原发布私钥 |
| `npm run release:version -- 0.3.1` | 同步前端、Tauri、Cargo、Android 版本 |
| `npm run release:verify` | 检查实际安装包签名、版本及篡改拒绝 |
| `npm run release:prepare` | 生成 `release/` 中待上传的安装包、签名、更新清单和说明 |
| `npm run android:prepare` | 验证 APK 实际包名、版本和原证书，复制为版本化发布文件 |
| `npm run build:cap` | Android 用的网页资源构建到 `dist/`，禁用 PWA Service Worker |
| `npm run mobile:sync` | 将当前网页资源复制到 Android 并同步插件 |

`dist/` 是共用的前端输出目录，内容取决于最近一次构建模式。Android 更新顺序是 `build:cap` → `mobile:sync` → 在 PowerShell 进入 `android/`，运行 `.\gradlew.bat assembleDebug` 或 `.\gradlew.bat assembleRelease`。

Windows 本机重新打包后需从托盘退出旧程序，再运行新版 exe 或安装包。0.3.0 起支持从正式 GitHub Release 在软件内更新，见 [发布说明](AUTO_UPDATE.md)。修改源码、运行网页构建，都不会自动更新已经打包的桌面程序或已安装的 APK。

### 测试文件

- `tests/unit/features/events/eventSchema.test.ts`：表单校验与日期时间载荷转换。
- `tests/unit/features/events/eventMappers.test.ts`：FullCalendar 事件映射与配色。
- `tests/unit/features/events/editorReliability.test.tsx`：失败保留、主动草稿、关闭选择、账号隔离和旧草稿兼容。
- `tests/unit/features/events/undo.test.tsx`：删除恢复、连续撤销与版本冲突。
- `tests/unit/features/desktop/reminders.test.ts`：提前量、全天 09:00、过期过滤和通知去重键。
- `tests/unit/features/updates/`：启动检查、检查接口、网络错误、失败重试、下载进度、重复操作与编辑器保护。
- `tests/unit/services/demoBackend.test.ts`：软删除、版本冲突和成功更新。
- `tests/unit/utils/dates.test.ts`：全天日期、时区边界和区间重叠。
- `tests/e2e/calendar.spec.ts`：应用加载、演示模式创建、可选真实登录创建。
- `tests/e2e/calendar-improvements.spec.ts`：缩放、类型快捷选择、主题色更新与自由取色。
- `tests/e2e/calendar-experience.spec.ts`：草稿、防误关闭、撤销、拖拽／拉伸、日期、月历缩放、Ctrl+滚轮与真实双指事件。
- `tests/e2e/calendar-v031.spec.ts`：点击／拖选／轻触的两步创建、年／月日期与放大后命中、年历及淡入动画、减少动态效果、逐条提醒持久化。
- `supabase/tests/rls.test.sql`：数据库账号隔离；需另外在测试数据库中执行。

Playwright 覆盖桌面 Chrome 和手机尺寸 Chrome。可用 `E2E_BASE_URL` 指向其他端口；真实登录用例需要 `E2E_EMAIL`、`E2E_PASSWORD`。浏览器测试不等同于已验证 Windows 或 Android 的全部原生行为。

## 7. 构建产物与缓存

| 目录／文件 | 含义 | 日常维护方式 |
| --- | --- | --- |
| `node_modules/` | 下载的前端依赖 | 通过 npm 管理，不直接修改 |
| `dist/` | 网页或原生容器使用的前端构建结果 | 通过对应构建命令重新生成 |
| `src-tauri/target/` | Rust 编译缓存与 Windows 产物 | 通过 Tauri 构建生成 |
| `src-tauri/target/release/chronos-calendar.exe` | 当前 Windows 独立程序 | 退出旧进程后启动新版 |
| `src-tauri/target/release/bundle/nsis/` | Windows 安装包 | 当前本地版本文件名为 `Chronos Calendar_0.3.1_x64-setup.exe` |
| `android/app/src/main/assets/public/` | 从 `dist/` 复制的网页资源 | 通过 `mobile:sync` 更新，不手改 |
| `release/Chronos-Calendar_<版本>_android.apk` | 验签后的 Android 发布附件 | 与 Windows 安装包一起上传同一正式 Release |
| `android/app/build/outputs/apk/` | Android debug／release APK | 通过 Gradle 构建生成 |
| `android/.gradle/`、`android/**/build/` | Gradle 缓存与中间结果 | 构建工具管理 |
| `test-results/`、`playwright-report/`、`coverage/` | 测试输出 | 按需要查看或重新生成 |

以上生成目录由 Git 忽略规则管理；本次整理保留了已有依赖、原生缓存、安装包和本机配置。

## 8. 本次结构优化与以后如何放文件

本次将原先的 `src/lib/` 拆为 `services/`、`hooks/`、`platform/` 和 `utils/`；基础类型配置归入 `features/categories/`。网络 Hook 与普通去抖函数分开，应用缓存配置独立为 `app/queryClient.ts`。单元测试按功能、服务、工具归类，原始规格包说明与开发提示归档到 `docs/archive/`，根目录以 `README.md` 为统一入口。

以后新增文件遵循以下规则：

- 一个业务功能自己的界面、API、查询和校验放在对应的 `features/<功能>/`。
- 多个界面共用的视觉组件放在 `components/`，保持与具体业务 API 解耦。
- 跨功能复用的 React Hook 放在 `hooks/`；只用于一个功能的 Hook 留在该功能目录。
- 客户端连接和替代后端放在 `services/`；业务 CRUD 留在功能模块的 API 文件。
- 不依赖 React 的通用计算与转换放在 `utils/`；任务类型等业务配置放回功能模块。
- 新测试放在 `tests/unit/` 对应分类或 `tests/e2e/`，文件名保持 `*.test.ts`／`*.spec.ts` 约定。
- 新文档加入 `docs/README.md` 导航；不再适用的历史材料放在 `docs/archive/` 并注明背景。

目前还没有重复日程、全局搜索、ICS 导出、离线写入或服务端提醒。Windows 自动更新已接入，线上分发依赖正式 GitHub Release；Android 暂时仍需安装新版 APK。
