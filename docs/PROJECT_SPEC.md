# Chronos Calendar — 跨端同步日程表项目设计文档

- 文档版本：1.0
- 编制日期：2026-10-08
- 项目定位：个人/少量用户使用的独立日历应用（非 Google Calendar 同步客户端）
- 交付形态：一个 React Web 前端，浏览器可用，可安装为 PWA；Supabase 承担认证、PostgreSQL 持久化和实时数据变更通知。
- 范围原则：优先开发可完整运行、可靠同步的 MVP；不要把尚未实现的功能做成误导性的按钮。

## 1. 产品目标与验收边界

### 1.1 核心用户故事

1. 用户首次打开应用，可以通过邮箱验证登录，并保持会话。
2. 同一用户在手机浏览器和电脑浏览器中可以查看同一份日历数据。
3. 用户点击空白日期/时间位置可以创建日程，填写标题、起止时间、全天状态、分类、备注。
4. 用户可以编辑、删除自己创建的日程，拖拽时间块移动或拉伸时长；保存失败必须回滚并给出错误提示。
5. 用户可以切换周、月、日视图，点击“今天”定位当前日期，并向前/向后切换时间范围。
6. 手机端以用户截图为视觉基准，具有顶部年月、周日期行、独立全天栏、分时刻度、彩色日程卡片、右下角创建按钮。
7. 在两个已登录且在线的设备上，一端保存后另一端无需手动刷新即可看到变化；断连/恢复前台之后自动重新拉取，确保最终收敛。
8. 用户 A 不得查看、修改用户 B 的日程，即使直接调用 API；未登录用户不得获取日程。

### 1.2 MVP（首版必须实现）

- 账号：Supabase Auth 邮箱 OTP / Magic Link（二选一，优先 OTP，按照实际认证配置）；登录、登出、身份状态保持。
- 视图：周（默认）、月、日；手机提供 3 日视图作为可选紧凑模式；“今天”、上一段/下一段。
- 事件：新增、编辑、软删除、全天事件、跨天事件、时间重叠显示、分类颜色、备注。
- 操作：点击选中、弹出编辑抽屉/对话框；桌面支持拖拽/拉伸；触屏如交互不稳定，优先编辑表单，拖拽可按设备能力渐进增强。
- 数据：Supabase PostgreSQL + RLS；读写真实数据；Realtime 在线同步；焦点恢复/网络恢复/重连时兜底重新读取。
- 系统：移动/电脑响应式、浅色与深色、中文、时区与日期校验、明确的保存状态、PWA 安装、基础无障碍。
- 质量：类型检查、lint、单元测试、基本 E2E、部署与初始化说明；不能以假数据冒充真实同步。

### 1.3 MVP 不做，后续扩展

- v1.1：循环/重复日程（RRULE、单次例外、整组修改）、关键词全局搜索、导出 ICS、农历与国内节假日。
- v1.2：提醒通知（按平台能力设计，服务端定时推送另做）、离线编辑和冲突队列、桌面快捷键、更完善的数据导入。
- v2：共享日历、权限协作、附件、与第三方日历双向同步。
- **注意：PWA 可离线打开界面 ≠ 离线日程可写 ≠ 关闭应用后仍能推送提醒。以上能力不作首版承诺。**

## 2. 技术选型和约束

| 层 | 技术 | 备注 |
|---|---|---|
| 构建 | Vite + React + TypeScript（strict） | 单仓库，SPA |
| 日历 | FullCalendar React v7 标准插件 | 使用 `@fullcalendar/react/{daygrid,timegrid,interaction}` 等 v7 导入路径；不要沿用 v6 的独立插件包 |
| 样式 | Tailwind CSS + 适量组件 CSS | 保留定制 FullCalendar 的 CSS 变量与 scoped 样式 |
| 日期 | date-fns（需要时），Intl API | 禁止随意使用字符串截取 `toISOString()` 作为本地日期 |
| 状态管理 | TanStack Query + React Context | Query 管远端缓存、失效/重试；Context 管 Auth、UI 偏好；不需要 Redux |
| 后端 | Supabase Auth + PostgREST + Realtime | 不额外搭建 Node 后端 |
| DB | Supabase PostgreSQL | RLS、版本号并发控制、软删除 |
| PWA | vite-plugin-pwa | 只预缓存静态资源，不缓存含认证信息的 API 响应 |
| 测试 | Vitest + Testing Library + Playwright | RLS 通过独立 SQL/本地 Supabase 环境检查 |
| 部署 | Vercel 或 Cloudflare Pages | HTTPS，SPA fallback，Auth redirect allowlist |

参考官方文档：
- FullCalendar React：https://fullcalendar.io/docs/react
- FullCalendar v7 迁移：https://fullcalendar.io/docs/upgrading-from-v6-js
- Supabase React：https://supabase.com/docs/guides/getting-started/quickstarts/reactjs
- Supabase RLS：https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Realtime：https://supabase.com/docs/guides/realtime/postgres-changes
- vite-plugin-pwa：https://vite-pwa-org.netlify.app/

> 依赖不指定未来固定版本号。实际安装时选择相互兼容的稳定版本，锁定 package-lock.json，先确认 FullCalendar v7 API，再实现组件。

## 3. 产品交互规范

### 3.1 手机周视图（核心界面）

```
┌─────────────────────────────────────┐
│ 2026/10          ⌕     日历      ⋮  │
├─────────────────────────────────────┤
│      年     月    [周]    日   三日  │
├─────────────────────────────────────┤
│     一    二    三    四    五   六  日 │
│     5     6     7     8     9  10  11 │
├─────┬───────────────────────────────┤
│全天 │ [周一论文计划]                 │
├─────┼───────────────────────────────┤
│09:00│        彩色日程块              │
│10:00│   机器学习                     │
│11:00│                     班会       │
│12:00│                               │
│ ... │                           今天 │
│21:00│                             ＋ │
└─────┴───────────────────────────────┘
```

设计要求：
- 顶部固定标题和视图导航；时间网格自身纵向滚动；七天周视图能完整显示一周，窄屏事件标题允许换行/省略，必要时支持三日视图。
- 星期从周一开始；中文简体；显示明确日期；“今天”有描边/背景区分，当前时间红色细线。
- 时轴允许滚动全天 00:00–24:00，默认首屏滚到 08:00 左右，可由设置调整；不能假设用户只安排白天日程。
- 事件颜色由分类控制，例如：课程琥珀色、科研紫色、会议蓝色、生活青色、任务绿色。颜色浅底+深字，并配左侧色条保证可读性。
- 编辑抽屉：标题（必填）、日期/时间、全天开关、分类、备注、保存/删除；禁止结束不晚于开始。
- 采用底部悬浮“＋”快捷创建；“今天”悬浮按钮在其上；按钮应有实际操作。
- 多个事件重叠时交错分栏，不遮盖整列；跨天事件和全天事件分别正确显示。
- 切换视图尽量保留当前定位日期；月份/年份切换由日期对象而非字符串拼接实现。

### 3.2 桌面视图

- 左侧可选紧凑月历和分类筛选，右侧主日历；优先保证主日历宽度，侧边栏可收起。
- 顶部保留「今天、前/后、周/月/日、添加事件、用户菜单」。
- 点击事件弹出详细信息；双击或编辑按钮进入编辑；拖拽事件时即时显示移动位置，失败自动撤销。
- 桌面端与手机端属于同一个 React 应用，CSS breakpoint 负责布局切换；不开发 Electron。

### 3.3 交互状态

- 载入中：骨架屏或轻量 loading；禁止空白屏。
- 网络断开：显示“离线，无法保存新修改”，不承诺写入；允许查看仍在内存中的已加载数据。
- 保存中：按钮禁用防连击、显示提示；成功后显示最新服务端记录；失败回滚日历移动并提示重试。
- 冲突：若另一台设备已经修改同一事件，显示“该日程已在其他设备更新，请重新加载”，不得悄悄覆盖。
- 无事件：显示引导信息，可创建首条日程。
- 会话失效：回到登录页；清理该用户的缓存和 Realtime 订阅。

## 4. 软件架构和数据流

```
手机浏览器/PWA     电脑浏览器/PWA
       \               /
        \             /
        React + FullCalendar
          |  TanStack Query
          |  Supabase JS Client
          v
        Supabase Auth
          |
        PostgREST <----> PostgreSQL（RLS）
          ^                 |
          |                 v
          +---- Realtime Postgres Changes
```

数据流：
1. 登录取得有效 session，所有读写通过客户端身份令牌传入 Supabase。
2. 进入周/月/日视图时触发日历 `datesSet`，根据可视区间 `[start, end)` 查询事件，避免一次加载所有历史日程。
3. 事件变更写入 Postgres；RLS 决定是否允许当前用户读取/写入。
4. Realtime 按 `user_id=eq.<uid>` 订阅 `events` 和 `categories` 的 INSERT/UPDATE，收到通知后对当前可视区间 query 失效并重新拉取；去抖避免风暴。**不要直接把未校验的远端 payload 当权威状态。**
5. 添加/编辑/软删除可使用乐观 UI，但必须在失败或冲突时回滚并以服务端为准。
6. 断网、Realtime 重连、PWA 从后台切回前台、切换账号时重新校验会话和同步视图。
7. 组件卸载或用户退出时移除订阅，避免重复订阅。

**数据删除采用软删除**：将 `deleted_at` 更新为非空。这样实时同步是 UPDATE 事件，规避真实 DELETE 在筛选/RLS 和旧记录方面的复杂性。列表查询必须过滤 `deleted_at IS NULL`，而订阅不要按 `deleted_at` 筛选，以便收到“刚被删除”的变更。

## 5. 数据库模型

实际建表 SQL 见 `supabase/migrations/202610080001_initial_schema.sql`。

### 5.1 `categories`

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid PK | 自动生成 |
| user_id | uuid FK | 对应 auth.users.id；只能操作自己的数据 |
| name | varchar(40) | 用户内名称唯一 |
| color | char(7) | `#RRGGBB`，HEX 正则校验 |
| sort_order | int | 显示顺序 |
| created_at, updated_at | timestamptz | 自动维护 |

### 5.2 `events`

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid PK | 唯一事件 ID |
| user_id | uuid FK | 事件所属账户 |
| category_id | uuid? | 用户自己拥有的分类；复合外键校验 |
| title | varchar(120) | 非空白标题 |
| description | text | 备注，限制合理长度 |
| all_day | boolean | 全天/分时类型 |
| start_at, end_at | timestamptz? | 分时事件的绝对时刻，开始含、结束不含 |
| start_date, end_date | date? | 全天事件用日期，结束日期**不含**，避免跨时区日期漂移 |
| deleted_at | timestamptz? | 软删除标志 |
| version | bigint | 并发控制，更新自动加 1 |
| created_at, updated_at | timestamptz | 自动记录 |

约束：分时事件必须填写两个时间戳，且 end_at > start_at，两个日期字段应为空；全天事件则恰好相反。事件可跨午夜。不为“时间重叠”设唯一约束，因为实际允许同一时间安排多件事。

### 5.3 时区约定

- 定时事件保存为 UTC 绝对时刻（`timestamptz`），显示按浏览器当前时区换算；不同设备不同时区看到不同的本地钟表时间属于预期行为。
- 全天事件保存为纯日期范围，不从 UTC 毫秒数转换，以防时区变化让全天日期偏一天。
- FullCalendar 中传入的事件都使用 exclusive end：如 10 月 8 日全天一天，`start=2026-10-08, end=2026-10-09`。
- 前后端严禁把“本地 YYYY-MM-DD”经过 `new Date(...).toISOString().slice(0,10)` 直接转换为全天日期。
- 未来若有“不同设备仍固定显示同一时区”的需求，可新增用户级 IANA `time_zone` 偏好及必要的 FullCalendar 时区支持。

### 5.4 并发与版本校验

- 每次 `UPDATE` 的触发器自动令 `version = old.version + 1`、`updated_at = now()`。
- 更新时将 `id`、`user_id`、`version` 的旧值作为过滤条件；若没有返回行，则判为被其他设备修改/删除，弹出冲突提示并刷新。
- 允许用户通过“刷新后重新编辑”解决冲突；不自动进行字段级合并。
- 软删除也使用同样的版本条件，防止在其他设备修改后误删。

### 5.5 RLS 与权限安全

- `categories`、`events` 必须启用 RLS；`anon` 无表权限；`authenticated` 只授予必要的操作权限。
- 所有 SELECT/INSERT/UPDATE 按 `auth.uid() = user_id` 授权；分类删除只能删自己的分类；事件不给客户端物理 DELETE 权限。
- 在数据库使用复合外键防止某用户的事件关联另一用户的分类。
- 登录信息不自行在 LocalStorage 中明文保存密码；Supabase 客户端管理会话。
- 浏览器仅使用 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`；**绝不放入 `service_role` / secret key**。
- 编写两个测试账号的负向测试，验证 A 不可能读取、编辑、删除 B 的日程；RLS 不能只靠页面行为推断。

## 6. 关键查询和转换

### 6.1 可见时间范围查询

- Calendar 提供的 `datesSet` 范围 `[viewStart, viewEnd)` 传给数据层。
- 定时事件重叠判定：`start_at < viewEnd AND end_at > viewStart`。
- 全天事件重叠判定：`start_date < dateEnd AND end_date > dateStart`。
- 两类条件 OR 合并，并限制 `user_id = currentUser`、`deleted_at IS NULL`。
- **注意：不应只查 `start_at BETWEEN viewStart AND viewEnd`**，否则跨越视图起点的事件会漏掉。
- 因为全天日历使用本地日期边界，`dateStart/dateEnd` 应从日历的日期范围按日历本地年月日得到，不直接从 UTC ISO 截断。
- 对初期个人数据量，可先拆为两条查询并合并排序，之后再测量和优化查询性能。

### 6.2 FullCalendar Event 映射

```ts
// 结构性伪码，按项目实装类型完善
function toCalendarEvent(row: EventRow, categoryColor: string): CalendarEvent {
  if (row.all_day) {
    return {
      id: row.id,
      title: row.title,
      start: row.start_date!,
      end: row.end_date!, // exclusive
      allDay: true,
      backgroundColor: categoryColor,
    };
  }
  return {
    id: row.id,
    title: row.title,
    start: row.start_at!, // ISO timestamp with timezone
    end: row.end_at!,
    allDay: false,
    backgroundColor: categoryColor,
  };
}
```

- `eventDrop` / `eventResize` 返回的 `revert()` 必须在请求错误或版本冲突时调用，完成后重新查询。
- 当通过拖拽把“分时”移动到“全天”或相反时，两个字段组必须完整转换，不能部分更新造成 CHECK 失败。

## 7. PWA 和部署策略

- 为应用提供 `manifest`（name、short_name、icons 192/512、display standalone、theme_color）。图标必须为真实 PNG 文件；不要引用不存在的资源。
- vite-plugin-pwa 使用提示更新（`registerType: 'prompt'`），**有未保存编辑时不得强制自动刷新**。
- `navigateFallback` 只服务同源 SPA 导航；仅缓存构建产出的静态资源与必要的公用字体/图标，不把 Supabase 认证与数据请求写入 Workbox 运行时缓存。
- 离线状态提示当前数据可能不是最新；首版离线不能执行会丢失的写入。
- 开发环境：Vite；生产：Vercel / Cloudflare Pages 配置 SPA fallback、HTTPS、环境变量。
- 在 Supabase Auth 的 redirect allowlist 设置本地地址和正式域名；验证手机端邮件链接打开后的回跳行为。
- 断开 WebSocket 后继续可编辑（在线 HTTP 仍可写），但必须在恢复时重新拉取；切换用户务必清理旧用户缓存。

## 8. 推荐代码目录

```text
chronos-calendar/
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── package-lock.json
├── index.html
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js
├── public/
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
├── docs/
│   ├── PROJECT_SPEC.md
│   └── DEVELOPMENT_PLAN.md
├── supabase/
│   ├── config.toml                # 可选：本地 CLI 初始化后创建
│   ├── migrations/
│   │   └── 202610080001_initial_schema.sql
│   └── tests/
│       └── rls.test.sql           # 测试两个身份的数据隔离
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── App.tsx
│   │   ├── providers.tsx          # Auth / Query / Toast 提供器
│   │   └── routes.tsx
│   ├── components/
│   │   ├── ui/                    # 通用 Button/Modal/Input/Toast
│   │   └── layout/
│   │       ├── AppShell.tsx
│   │       ├── Header.tsx
│   │       └── MobileNav.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── AuthProvider.tsx
│   │   │   └── authService.ts
│   │   ├── calendar/
│   │   │   ├── CalendarPage.tsx
│   │   │   ├── CalendarToolbar.tsx
│   │   │   ├── CalendarGrid.tsx
│   │   │   ├── CalendarEventCard.tsx
│   │   │   └── useCalendarRange.ts
│   │   ├── events/
│   │   │   ├── EventEditor.tsx
│   │   │   ├── EventDetails.tsx
│   │   │   ├── eventsApi.ts
│   │   │   ├── eventQueries.ts
│   │   │   ├── eventMappers.ts
│   │   │   ├── eventSchema.ts     # 表单校验
│   │   │   └── useEventsRealtime.ts
│   │   ├── categories/
│   │   │   ├── CategoryManager.tsx
│   │   │   ├── categoriesApi.ts
│   │   │   └── categoryQueries.ts
│   │   └── settings/
│   │       └── SettingsPage.tsx
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── dates.ts
│   │   ├── network.ts
│   │   └── errors.ts
│   ├── styles/
│   │   ├── globals.css
│   │   └── calendar.css
│   └── types/
│       └── database.ts
├── tests/
│   ├── unit/
│   │   ├── dates.test.ts
│   │   └── eventMappers.test.ts
│   └── e2e/
│       └── calendar.spec.ts
└── playwright.config.ts
```

可根据真实实现增删小组件，但必须保留 `lib / features / supabase / tests` 的职责边界。禁止全部逻辑堆在 `App.tsx`。

## 9. 开发里程碑、交付与通过标准

### M0 — 可启动基础工程
- `npm install`, `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck` 运行成功。
- 环境变量有示例与缺失提示。缺少云端凭证时可以展示**显式标注为演示模式**的本地日历，不得伪称已同步。

### M1 — 视觉和交互
- 与手机截图相近的中文周视图；月/日/三日视图正常；分类配色、全天栏、当前时间线；编辑表单可完成完整字段校验。
- 使用本地模拟数据时，拖拽和编辑交互可展示，但界面必须明确演示模式。

### M2 — 数据库和认证
- 执行迁移后两张表、索引、触发器、RLS 就绪；邮箱登录成功；真实事件/分类增删改查可用。
- 未登录不能读；账号 A 的 API 请求无法读或修改 B 的数据；事件归属另一人的分类必须失败。

### M3 — 同步和冲突
- 设备 A 创建/修改/软删除，设备 B 在线时看到变化；网络/前台恢复后自动收敛。
- 两设备并发修改相同事件，第二个写入被版本条件拒绝，UI 提示并刷新。
- 拖拽失败 `revert()`，不会留下“画面移动了但数据库没变”的错误状态。

### M4 — PWA 和部署
- 手机浏览器与电脑浏览器布局正常；安装后可独立窗口运行；生产 HTTPS、生效的图标/manifest、版本更新提示。
- 首版明确标识离线不可编辑，并且不缓存敏感 API 响应。
- README 包含从零启动、创建 Supabase 项目、迁移、配置 Auth、部署与手工测试流程。

## 10. 测试清单（至少覆盖）

1. 日期/时间：跨天、全天的 exclusive end、月末、闰日、不同时区显示、一小时以内事件。
2. 表单：空白标题、结束早于开始、跨天合法、切换全天与分时。
3. 日历：选择时间区块新增、视图切换不丢失当前日期、重叠事件、事件拖拽失败回滚。
4. 数据：时间范围重叠查询不漏跨界事件；被软删除事件不在查询结果中。
5. 多设备：创建、编辑、删除、断线恢复、背景切回、重复订阅防护。
6. 数据隔离：不同账户增删改查相互拒绝，未登录角色不能读。
7. PWA：manifest 与图标真实存在、安装状态、更新提示、断网告警、恢复后刷新。
8. 质量：`npm run build`、TypeScript strict、lint、unit/e2e 真正执行后才可以声称通过。

## 11. 风险和简化策略

| 风险 | 处理策略 |
|---|---|
| 移动端七列过窄 | 默认保留周视图，并给三日视图切换；紧凑字体/事件内容摘要 |
| 同步消息偶发漏收 | Realtime 用于失效通知，聚焦/重连主动拉取，以服务端数据为准 |
| 同事件并发修改 | version 条件更新 + 冲突提示，不做隐式覆盖 |
| PWA 离线与实时同步混淆 | 首版离线只提供静态框架/已加载视图，明确禁用写入 |
| 日程跨时区 | 分时存 timestamptz、全天用 DATE；记录当前时区语义 |
| Supabase 免费资源限制 | 只请求可见区间、索引优化、个人项目适用；重要数据可定期导出备份 |
| FullCalendar 新旧版本 API 不一致 | 依照实际安装的 v7 官方文档完成导入、样式和主题，不混用旧写法 |

## 12. 版本完成定义（Definition of Done）

**MVP 完成的唯一标准**：可以在真实的两台设备用同一账号完成“登录 → 创建日程 → 另一端出现 → 修改并同步 → 删除并同步 → 断线恢复 → 冲突处理”的闭环，且不存在跨账户数据读取漏洞。漂亮的界面、模拟数据或者本机双标签页并不能代替这个闭环。
