# Chronos Calendar — 开发规格包

> 历史归档：这是项目尚未实现时的规格包说明。当前使用方式见 [根目录 README](../../README.md)，实际目录与功能见 [项目结构说明](../PROJECT_STRUCTURE.md)。下文保留原始背景与路径记录。

此压缩包是交给 Codex CLI 的**开发规格**，并非已经实现的日历 App。

## 文件清单

- `docs/PROJECT_SPEC.md`：完整产品和技术设计（含目录结构、数据结构、查询、权限、PWA、安全、测试、里程碑）。
- `docs/CODEX_CLI_PROMPT.md`：可以直接给 Codex CLI 的完整开发任务提示词。
- `supabase/migrations/202610080001_initial_schema.sql`：MVP 两张核心表、索引、约束、触发器、权限和 Realtime publication。

## 如何交给 Codex CLI

1. 本机创建空文件夹 `chronos-calendar`。
2. 将本压缩包中的 `docs` 和 `supabase` 两个目录复制到 `chronos-calendar` 文件夹中。
3. 用终端进入 `chronos-calendar` 并启动 `codex`。
4. 复制 `docs/CODEX_CLI_PROMPT.md` 的全部内容给 Codex；确保 Codex 能读到本地两个文件。
5. 根据 Codex 的提示新建 Supabase 项目并配置：
   - `VITE_SUPABASE_URL`：Supabase Project URL。
   - `VITE_SUPABASE_PUBLISHABLE_KEY`：Supabase publishable key（浏览器允许使用）。
   - 绝不放入 `service_role` 或 secret key。
6. 让 Codex 初始化应用并按 M0–M5 阶段实现、检查与修复。

**请勿直接在远端数据库上反复执行同一 migration**，迁移工具应管理执行版本。首次执行前建议在开发项目验证结构、权限与数据库 SQL 兼容性。

## 一个实用的分阶段调用办法

如果 Codex 上下文变长或工作受限，依次给它以下目标，而不必再次发送巨大的任务说明：

- 第一次：`阅读 docs/PROJECT_SPEC.md，从 M0、M1 开始；完成实际代码、运行、检查修复。`
- 第二次：`在现有项目上继续 M2：真实 Supabase Auth、迁移、CRUD、RLS 测试。`
- 第三次：`继续 M3：Realtime、版本冲突与断线恢复，确保双端同步。`
- 第四次：`继续 M4、M5：PWA、部署文档、真实测试和缺陷修复。`

## 注意

设计文件中的 SQL 作为可执行迁移草案交付，但本包不附带正在运行的 PostgreSQL/Supabase 实例。只有把迁移实际执行并通过 RLS 测试后，才能视为数据库部分已完成。FullCalendar API 需按项目安装的真实版本验证。
