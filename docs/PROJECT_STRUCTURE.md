# Chronos Calendar：项目结构与功能说明

更新日期：2026-10-26。当前版本：0.5.0。

这是一个已实现的个人日程应用。网页、Windows 桌面程序和 Android 应用共用 `src/` 下的 React 前端；配置 Supabase 后，通过账号同步日程。未配置凭证时，使用明确标注的本地演示模式。

## 1. 从哪里开始

| 想做什么 | 查看哪里 |
| --- | --- |
| 启动项目、配置账号、打包安装程序 | [根目录 README](../README.md) |
| 了解日历页面如何组合 | [CalendarPage.tsx](../src/features/calendar/CalendarPage.tsx) |
| 修改时间表布局、拖拽与时间格 | [CalendarGrid.tsx](../src/features/calendar/CalendarGrid.tsx) |
| 修改缩放范围与菜单 | [CalendarTopBar.tsx](../src/features/calendar/CalendarTopBar.tsx)、[useCalendarZoom.ts](../src/features/calendar/useCalendarZoom.ts) |
| 修改新建／编辑任务表单 | [EventEditor.tsx](../src/features/events/EventEditor.tsx)、[TimeInput.tsx](../src/components/ui/TimeInput.tsx) |
| 修改类型标签与内联新建 | [CategoryPicker.tsx](../src/features/events/CategoryPicker.tsx)、[categoryQueries.ts](../src/features/categories/categoryQueries.ts) |
| 修改选区高亮 | [SelectionOverlay.tsx](../src/features/calendar/SelectionOverlay.tsx)、[useCalendarSelection.ts](../src/features/calendar/useCalendarSelection.ts) |
| 修改待办清单与拖入日历 | [TaskPanel.tsx](../src/features/tasks/TaskPanel.tsx)、[useTaskDraggable.ts](../src/features/tasks/useTaskDraggable.ts) |
| 修改选区高亮 | [SelectionOverlay.tsx](../src/features/calendar/SelectionOverlay.tsx)、[useCalendarSelection.ts](../src/features/calendar/useCalendarSelection.ts) |
| 修改撤销 | [useEventUndo.ts](../src/features/events/useEventUndo.ts) |
| 修改手势缩放、滑动切视图与时间定位 | [useCalendarGestures.ts](../src/features/calendar/useCalendarGestures.ts)、[useCalendarSwipe.ts](../src/features/calendar/useCalendarSwipe.ts) |
| 修改日期栏农历与节气 | [lunar.ts](../src/utils/lunar.ts)、[CalendarGrid.tsx](../src/features/calendar/CalendarGrid.tsx) |
| 修改桌面启动与提醒 | [DesktopSettings.tsx](../src/features/desktop/DesktopSettings.tsx)、[reminders.rs](../src-tauri/src/reminders.rs) |
| 修改自动更新与发布 | [SoftwareUpdateProvider.tsx](../src/features/updates/SoftwareUpdateProvider.tsx)、[AUTO_UPDATE.md](AUTO_UPDATE.md) |
| 修改主题色和颜色计算 | [colors.ts](../src/utils/colors.ts)、[ColorPicker.tsx](../src/components/ui/ColorPicker.tsx) |
| 修改设置界面 | [SettingsPage.tsx](../src/features/settings/SettingsPage.tsx) |
| 查看数据库定义与权限 | [数据库迁移](../supabase/migrations/202610080001_initial_schema.sql)、[待办迁移](../supabase/migrations/202610190001_tasks.sql)、[待办关联迁移](../supabase/migrations/202610200001_task_event_link.sql) |
| 查看项目进度与后续计划 | [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) |

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
│   ├── DEVELOPMENT_PLAN.md         # 进度、验证记录、后续计划
│   ├── PROJECT_SPEC.md             # 初始产品与技术设计
│   └── archive/                    # 原始规格包资料
│       ├── BLUEPRINT_README.md
│       └── CODEX_CLI_PROMPT.md
├── src/                           # Web／Windows／Android 共用前端
│   ├── main.tsx                    # React 入口，加载全局样式
│   ├── app/                        # 应用装配、主题和缓存配置
│   ├── features/                   # 按业务功能组织的页面与数据操作
│   │   ├── auth/                   # 登录、注册、会话与密码
│   │   ├── calendar/               # 日历页面、顶栏、时间表、视图切换与筛选
│   │   ├── events/                 # 日程表单、类型标签、校验、增删改查与同步
│   │   ├── tasks/                  # 待办清单、数据操作与拖入日历
│   │   ├── categories/             # 类型数据操作（不再内置默认类型）
│   │   ├── desktop/                # Windows 开机启动、通知设置与提醒计划
│   │   ├── updates/                # 桌面启动检查、下载进度与安装更新
│   │   └── settings/               # 类型管理与账号设置
│   ├── components/                 # 可复用界面组件
│   │   ├── layout/                 # 应用外壳（顶栏由 calendar 提供）
│   │   └── ui/                     # 按钮、图标、弹窗、提示、取色器、数字时间输入
│   ├── hooks/                      # 跨功能复用的 React Hook
│   ├── services/                   # Supabase 客户端与演示后端
│   ├── platform/                   # Web／Tauri／Capacitor 平台检测
│   ├── utils/                      # 日期、农历、颜色、错误和去抖工具
│   ├── types/                      # 共享数据类型
│   ├── styles/                     # 全局、日历与弹层样式
│   └── vite-env.d.ts               # Vite 环境类型
├── public/icons/                  # PWA 图标与原生图标源图
├── tests/                         # 前端自动化测试
│   ├── setup.ts                    # 单元测试初始化
│   ├── unit/
│   │   ├── features/events/        # 表单校验、日程映射与编辑器可靠性测试
│   │   ├── features/desktop/       # 提醒时间、全天与过期日程测试
│   │   ├── components/             # 数字时间输入等公共组件测试
│   │   ├── services/               # 演示后端测试
│   │   └── utils/                  # 日期边界、区间与农历测试
│   └── e2e/                        # 桌面／手机浏览器交互测试
├── supabase/                      # 云端数据库工程
│   ├── migrations/                # 表、索引、触发器、RLS 与 Realtime（含 tasks）
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
| `src/components/layout/` | `AppShell.tsx` | 页面布局、顶部日历栏、侧栏区域、演示／离线提示与右下角悬浮按钮 |
| `src/components/ui/` | `Button.tsx`、`Modal.tsx`、`Toast.tsx` | 通用按钮、桌面弹窗／手机抽屉（含固定底部操作区）、操作结果提示 |
| `src/components/ui/` | `Icons.tsx` | 顶栏、菜单与关闭等 SVG 图标 |
| `src/components/ui/` | `TimeInput.tsx` | 桌面／手机统一的数字时间输入：支持 `HH:mm` 与 `0930`，不触发原生时钟表盘 |
| `src/components/ui/` | `ColorPicker.tsx` | 主题色板、自定义取色、当前色值和配色预览 |

### 业务功能

| 模块 | 主要文件 | 功能 |
| --- | --- | --- |
| `features/auth/` | `LoginPage.tsx` | 邮箱密码登录／注册、邮件链接登录与原生平台提示 |
| `features/auth/` | `AuthProvider.tsx`、`authService.ts` | 会话获取与监听、退出、密码修改、认证错误中文化 |
| `features/calendar/` | `CalendarPage.tsx` | 组合日历、顶栏、侧栏、日程弹窗与设置；处理点击、选择、拖拽、拉伸及失败回滚 |
| `features/calendar/` | `CalendarTopBar.tsx` | 大标题、日期选择浮层、视图标签、待办入口／今天／更多菜单、缩放与主题切换 |
| `features/calendar/` | `CalendarGrid.tsx` | FullCalendar 年／月／周／日／日程视图、农历日期栏、窄时间列、滑动切视图、待办拖入与当前时间线 |
| `features/calendar/` | `CalendarEventCard.tsx` | 标题优先、最多三行，窄列只显示开始时间，待办标记，悬停完整信息和类型色条 |
| `features/calendar/` | `Sidebar.tsx`、`MiniCalendar.tsx` | 桌面品牌栏、迷你月历跳转、待办插槽与分类筛选；迷你月历也与标题日期浮层共用 |
| `features/calendar/` | `calendarViews.ts` | 年／月／周／日／日程顺序、相邻视图计算与标签映射 |
| `features/calendar/` | `SelectionOverlay.tsx` | 用真实时间格坐标绘制明显的选区边框，上下粗线可拖动调整开始／结束时间 |
| `features/calendar/` | `useCalendarRange.ts` | 维护当前可视日期范围、视图、标题与定位日期 |
| `features/calendar/` | `useCalendarZoom.ts` | 50%–200% 时间轴缩放，25% 步长、重置与本机记忆 |
| `features/calendar/` | `useCalendarGestures.ts` | Ctrl+滚轮／双指缩放、保留时间锚点、抑制手势误点击 |
| `features/calendar/` | `useCalendarSwipe.ts` | 移动端单指横向滑动切换视图；纵向滚动、双指与事件拖动不误触 |
| `features/calendar/` | `useCalendarSelection.ts` | 第一次点击按整点选中一小时、拖选先选中、再次点击确认创建；上下粗线拖动时更新范围并同步原生高亮 |
| `features/events/` | `EventEditor.tsx`、`EventDetails.tsx` | 简洁表单、失败保留、关闭确认、逐条提醒、跨天与备注展开、待办日程移回、固定底部操作栏 |
| `features/events/` | `CategoryPicker.tsx` | 彩色类型标签选择，替代下拉菜单；无合适类型时可命名并选色新建 |
| `features/events/` | `useEventUndo.ts` | 最近 20 步撤销，恢复软删除和修改前数据，处理连续撤销版本及冲突 |
| `features/events/` | `eventSchema.ts` | 表单默认值、标题与时间校验、表单／数据库载荷转换 |
| `features/events/` | `eventMappers.ts` | 数据库日程转换为 FullCalendar 事件，并附带主题色、待办关联和版本 |
| `features/events/` | `eventsApi.ts`、`eventQueries.ts` | 按时间区间查询、创建、版本条件更新、软删除与缓存刷新 |
| `features/events/` | `useEventsRealtime.ts` | 订阅云端日程与类型变化；网络／焦点恢复时重新查询 |
| `features/tasks/` | `TaskPanel.tsx`、`TaskSheet.tsx` | 桌面侧栏／移动端抽屉的待办清单，新增、完成、删除与拖拽入口；也是日程拖回的放置区 |
| `features/tasks/` | `useTaskDraggable.ts` | 将待办列表接入 FullCalendar 外部拖拽，落入时间表时生成事件 |
| `features/tasks/` | `tasksApi.ts`、`taskQueries.ts` | Supabase／演示后端的待办 CRUD、缓存刷新，以及把待办日程移回清单的联动更新 |
| `features/categories/` | `categoriesApi.ts`、`categoryQueries.ts` | 类型的读取、创建、改名、改色、删除和缓存刷新（无内置默认类型） |
| `features/settings/` | `SettingsPage.tsx` | 自定义类型管理、主题色、桌面／更新设置、登录邮箱与密码设置 |
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
| `src/services/demoBackend.ts` | 本机演示数据、示例播种、类型／日程／待办 CRUD、软删除与版本冲突模拟 |
| `src/hooks/useOnlineStatus.ts` | 监听浏览器联网／离线事件 |
| `src/hooks/useBackButton.ts` | Android 返回键优先关闭弹层，没有弹层时退出 |
| `src/platform/detectPlatform.ts` | 检测 Web、Tauri 桌面和 Capacitor 原生平台 |
| `src/utils/dates.ts` | 本地日期与时间转换、日期显示、区间重叠、全天结束日期转换 |
| `src/utils/lunar.ts` | 农历月日与二十四节气标签（Intl 中国历法 + 常用节气近似公式，带缓存） |
| `src/utils/colors.ts` | 十种可选主题色、默认色、浅底与深色文字的计算 |
| `src/utils/errors.ts` | 版本冲突、离线错误与通用错误提示转换 |
| `src/utils/debounce.ts` | 合并频繁调用，供实时同步缓存刷新使用 |
| `src/types/database.ts` | 日程、类型、待办、写入载荷与查询区间的 TypeScript 类型 |
| `src/styles/globals.css` | Tailwind 入口、基础样式和安全区 |
| `src/styles/calendar.css` | 顶栏、视图标签、侧栏、时间格、日期栏、日程卡片、浮层与悬浮按钮样式 |
| `src/styles/dialogs.css` | 弹层、编辑器表单、类型标签、色板与固定底部操作区样式 |

## 4. 一次日程操作如何流转

1. 用户在 `CalendarPage` 点击日期或添加按钮，打开 `EventEditor`。
2. `eventSchema` 校验表单，并转换成数据库写入载荷。
3. `eventQueries` 通过 TanStack Query 发起写入，调用 `eventsApi`。
4. 有 Supabase 客户端时写入云端；没有时转交 `demoBackend`，写入本机演示数据。
5. 成功后使相关查询缓存失效，重新查询当前时间范围。
6. `eventMappers` 将结果与类型配色一起转换成 FullCalendar 事件，更新日历。

云端变化通过 Realtime 触发重新查询；拖拽与拉伸直接调用事件 API，并在失败时撤销界面上的移动。编辑与删除带上 `version`，避免静默覆盖其他设备的新修改。

视图标签与移动端滑动都调用 `calendarViews.ts` 的相邻视图计算，再由 FullCalendar `changeView` 切换。标题日期浮层与侧栏迷你月历共用 `MiniCalendar`：翻月只改变浮层内的月份，点日期才 `gotoDate`。去除左右箭头后，桌面用 `← / →` 翻页、`T` 回到今天；移动端通过日期浮层与「今」按钮定位。

打开编辑器时 `CalendarGrid` 因 `memo` 与稳定回调不会重排 FullCalendar；编辑器先绘制抽屉，再在下一帧聚焦标题。提交按钮固定在弹层底部；关闭有未保存内容的表单时只能「放弃修改并关闭」或「继续编辑」，不再提供草稿。成功修改／删除记录到撤销栈，撤销通过相同版本条件恢复原记录，不创建重复日程。系统提醒按单条日程在当前设备选择，无需数据库迁移。

待办由 `TaskPanel` 读取 `tasks`，新增／勾选／删除后刷新缓存。拖拽使用 FullCalendar 的 `Draggable` 与 `eventReceive`：松手时先移除日历临时事件，再由 `CalendarPage` 创建带 `task_id` 的正式日程并调用 `updateTask` 把待办标记完成；拖入月／年视图时创建全天日程。移动端抽屉不铺满屏幕，长按待办后可以继续拖到上方时间表。

待办日程第一次点击只选中，第二次进入编辑；拖动开始也会选中，并显示蓝色描边。编辑器的「移回待办清单」或桌面拖回左侧待办栏会调用 `useUnscheduleTaskEvent`：软删除日程并把待办恢复为未完成。连续拖动以 `latestRows` 记录最新版本，成功写入后同步更新 FullCalendar 事件的 `version`／`raw` 扩展属性，避免短时间多次拖动使用旧版本而误报冲突。

第一次点击时间表时，`useCalendarSelection` 用 `startOfHour` 把起点对齐到整点并把终点设为 +1 小时；拖选仍由 FullCalendar 按 15 分钟吸附。`SelectionOverlay` 用 `data-date` / `data-time` 读取时间格坐标，在选区上绘制描边；上下两条粗线的拖动由 `SelectionOverlay` 换算成时间，经 `setRange` 更新选区并通过 `api.select` 同步原生高亮。底部提示提供「新建日程」按钮。

桌面提醒计划由前端查询近期日程生成，Rust `reminders.rs` 每 10 秒检查到期项；通知成功后记录去重键。窗口隐藏到托盘仍运行原生线程；退出后停止。开机启动通过 Tauri 插件注册当前安装程序，并传入 `--autostart` 隐藏启动。

任务类型不再内置默认值：新账号没有类型，日程可保持「未分类」。在编辑器内新建类型时创建一条类型记录并自动选中；设置页仍可改名、改色、删除，修改颜色会影响该类型的所有日程。演示模式的示例类型只在 `VITE_DEMO_SEED` 播种时生成，不属于产品默认值。

## 5. 数据保存位置

| 内容 | 保存位置 | 是否跨设备 |
| --- | --- | --- |
| 真实账号的日程、类型与待办 | Supabase 的 `events`、`categories`、`tasks` 表 | 同账号联网时同步 |
| 演示日程、类型与待办 | `localStorage`，键 `chronos.demo.v1` | 否 |
| 深浅色偏好 | `localStorage`，键 `chronos.theme` | 否 |
| 时间轴缩放比例 | `localStorage`，键 `chronos.calendar.zoom` | 否 |
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
| `npm run dev:demo` | 演示模式开发服务器，不读取 `.env.local`，可加 `-- --port 5173` |
| `npm run desktop:dev` | 启动 Tauri 开发窗口，查看源码实时更新 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | ESLint 检查 |
| `npm run test` | 运行 `tests/unit/` 下的单元测试 |
| `npm run test:e2e` | 浏览器交互测试；先启动开发服务器，默认连接 1420 端口 |
| `npm run build` | 网页生产构建到 `dist/`，生成 PWA 资源 |
| `npm run desktop:build` | 重新构建前端并生成 Windows exe、签名 NSIS 安装包与 `.sig` |
| `npm run updater:setup` | 配置更新签名公钥，要求保留原发布私钥 |
| `npm run release:version -- 0.5.0` | 同步前端、Tauri、Cargo、Android 版本 |
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
- `tests/unit/features/events/editorReliability.test.tsx`：保存失败保留、关闭选择、无草稿写入、通知权限与待办日程移回。
- `tests/unit/features/events/undo.test.tsx`：删除恢复、连续撤销与版本冲突。
- `tests/unit/features/desktop/reminders.test.ts`：提前量、全天 09:00、过期过滤和通知去重键。
- `tests/unit/features/updates/`：启动检查、检查接口、网络错误、失败重试、下载进度、重复操作与编辑器保护。
- `tests/unit/components/TimeInput.test.tsx`：数字时间输入、`HH:mm` 与四位数字失焦归一化、非法值恢复。
- `tests/unit/services/demoBackend.test.ts`：软删除、版本冲突、成功更新、类型排序／删除、待办 CRUD／排序与旧数据兼容。
- `tests/unit/utils/dates.test.ts`：全天日期、时区边界和区间重叠。
- `tests/unit/utils/lunar.test.ts`：农历日写法、闰月、二十四节气与日期无效时的降级。
- `tests/e2e/calendar.spec.ts`：应用加载、演示模式创建、可选真实登录创建。
- `tests/e2e/calendar-improvements.spec.ts`：菜单缩放、无默认类型、内联新建类型与主题色更新。
- `tests/e2e/calendar-experience.spec.ts`：防误关闭、撤销、拖拽／拉伸、农历日期栏、月历缩放、Ctrl+滚轮与真实双指事件。
- `tests/e2e/calendar-v031.spec.ts`：点击／拖选／轻触的两步创建、年／月日期与放大后命中、年历及滑动动画、减少动态效果、逐条提醒持久化。
- `tests/e2e/calendar-v040.spec.ts`：整点一小时选区和明显高亮、上下粗线拖动调时、数字时间输入、左右滑动、日期选择、移动端滑动切视图、窄时间列、草稿移除、待办拖入／两步编辑／移回、类型标签与连续拖动版本。
- `supabase/tests/rls.test.sql`：数据库账号隔离（含待办表）；需另外在测试数据库中执行。

Playwright 覆盖桌面 Chrome 和手机尺寸 Chrome。可用 `E2E_BASE_URL` 指向其他端口；真实登录用例需要 `E2E_EMAIL`、`E2E_PASSWORD`。浏览器测试不等同于已验证 Windows 或 Android 的全部原生行为。

## 7. 构建产物与缓存

| 目录／文件 | 含义 | 日常维护方式 |
| --- | --- | --- |
| `node_modules/` | 下载的前端依赖 | 通过 npm 管理，不直接修改 |
| `dist/` | 网页或原生容器使用的前端构建结果 | 通过对应构建命令重新生成 |
| `src-tauri/target/` | Rust 编译缓存与 Windows 产物 | 通过 Tauri 构建生成 |
| `src-tauri/target/release/chronos-calendar.exe` | 当前 Windows 独立程序 | 退出旧进程后启动新版 |
| `src-tauri/target/release/bundle/nsis/` | Windows 安装包 | 当前本地版本文件名为 `Chronos Calendar_0.5.0_x64-setup.exe` |
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

目前还没有重复日程、全局搜索、ICS 导出、离线写入或服务端提醒。Windows 自动更新已接入，线上分发依赖正式 GitHub Release；Android 暂时仍需安装新版 APK。0.5.0 已移除日程草稿功能，待办清单保留并适配新版界面。
