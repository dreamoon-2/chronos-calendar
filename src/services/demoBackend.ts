/**
 * 演示模式后端：使用 localStorage 保存本地数据，接口与 Supabase 后端对齐。
 * 仅用于没有云端凭证时验证界面与交互，明确标注为演示，不伪装成跨端同步。
 */
import type {
  CalendarRange,
  CategoryInsert,
  CategoryRow,
  EventInsert,
  EventRow,
  EventUpdate,
  TaskInsert,
  TaskRow,
  TaskUpdate,
} from '../types/database'
import { ConflictError } from '../utils/errors'
import { eventOverlapsRange, toDateOnly } from '../utils/dates'

export const DEMO_USER_ID = 'demo-user'
const STORAGE_KEY = 'chronos.demo.v1'

interface DemoState {
  categories: CategoryRow[]
  events: EventRow[]
  tasks: TaskRow[]
}

/**
 * 仅用于演示数据的示例分类，不是产品默认类型。
 * 新账号（真实模式）默认没有分类，需自行在设置或日程编辑器中创建。
 */
const DEMO_CATEGORIES = [
  { name: '学习', color: '#d97706' },
  { name: '研究', color: '#7c3aed' },
  { name: '会议', color: '#2563eb' },
  { name: '生活', color: '#0d9488' },
]

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function buildSeed(): DemoState {
  const now = new Date()
  const categories: CategoryRow[] = DEMO_CATEGORIES.map((c, i) => ({
    id: uid(),
    user_id: DEMO_USER_ID,
    name: c.name,
    color: c.color,
    sort_order: i,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  }))

  const today = new Date()
  const mk = (
    dayOffset: number,
    startTime: string,
    endTime: string,
    title: string,
    categoryIdx: number,
  ): EventRow => {
    const start = new Date(today)
    start.setDate(today.getDate() + dayOffset)
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    start.setHours(sh, sm, 0, 0)
    const end = new Date(start)
    end.setHours(eh, em, 0, 0)
    return {
      id: uid(),
      user_id: DEMO_USER_ID,
      category_id: categories[categoryIdx].id,
      task_id: null,
      title,
      description: '演示数据',
      all_day: false,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      start_date: null,
      end_date: null,
      deleted_at: null,
      version: 1,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }
  }

  const events: EventRow[] = [
    mk(0, '09:00', '10:30', '机器学习', 1),
    mk(0, '14:00', '15:30', '班会', 2),
    mk(1, '10:00', '11:00', '论文讨论', 1),
    mk(-1, '19:00', '20:00', '健身', 3),
  ]

  // 一个全天事件
  const allDayStart = toDateOnly(today)
  const allDayEnd = new Date(today)
  allDayEnd.setDate(today.getDate() + 1)
  events.push({
    id: uid(),
    user_id: DEMO_USER_ID,
    category_id: categories[2].id,
    task_id: null,
    title: '论文计划',
    description: '全天安排（演示）',
    all_day: true,
    start_at: null,
    end_at: null,
    start_date: allDayStart,
    end_date: toDateOnly(allDayEnd),
    deleted_at: null,
    version: 1,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  })

  const tasks: TaskRow[] = [
    {
      id: uid(),
      user_id: DEMO_USER_ID,
      title: '整理论文阅读笔记',
      notes: '',
      done: false,
      estimated_minutes: 60,
      category_id: categories[1].id,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: uid(),
      user_id: DEMO_USER_ID,
      title: '准备周会材料',
      notes: '',
      done: false,
      estimated_minutes: 60,
      category_id: categories[2].id,
      created_at: new Date(now.getTime() - 60_000).toISOString(),
      updated_at: new Date(now.getTime() - 60_000).toISOString(),
    },
    {
      id: uid(),
      user_id: DEMO_USER_ID,
      title: '回复邮件',
      notes: '',
      done: true,
      estimated_minutes: 30,
      category_id: categories[3].id,
      created_at: new Date(now.getTime() - 120_000).toISOString(),
      updated_at: new Date(now.getTime() - 120_000).toISOString(),
    },
  ]

  return { categories, events, tasks }
}

function shouldSeed(): boolean {
  return import.meta.env.VITE_DEMO_SEED !== 'false'
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DemoState>
      if (Array.isArray(parsed.categories) && Array.isArray(parsed.events)) {
        return {
          categories: parsed.categories,
          events: parsed.events,
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        }
      }
    }
  } catch {
    // 忽略损坏数据，重新播种
  }
  const seeded = shouldSeed() ? buildSeed() : { categories: [], events: [], tasks: [] }
  save(seeded)
  return seeded
}

function save(state: DemoState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage 不可用时降级为内存（不做持久化）
  }
}

function sortCategories(list: CategoryRow[]): CategoryRow[] {
  return [...list].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
}

function sortTasks(list: TaskRow[]): TaskRow[] {
  return [...list].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    return b.created_at.localeCompare(a.created_at)
  })
}

export const demoBackend = {
  userId: DEMO_USER_ID,

  listCategories(): CategoryRow[] {
    return sortCategories(load().categories)
  },

  createCategory(input: CategoryInsert): CategoryRow {
    const state = load()
    const now = new Date().toISOString()
    const row: CategoryRow = {
      id: uid(),
      user_id: DEMO_USER_ID,
      name: input.name,
      color: input.color,
      sort_order: input.sort_order,
      created_at: now,
      updated_at: now,
    }
    state.categories.push(row)
    save(state)
    return row
  },

  updateCategory(id: string, patch: Partial<CategoryInsert>): CategoryRow {
    const state = load()
    const idx = state.categories.findIndex((c) => c.id === id)
    if (idx < 0) throw new Error('分类不存在')
    const row = { ...state.categories[idx], ...patch, updated_at: new Date().toISOString() }
    state.categories[idx] = row
    save(state)
    return row
  },

  deleteCategory(id: string): void {
    const state = load()
    state.categories = state.categories.filter((c) => c.id !== id)
    state.events = state.events.map((e) =>
      e.category_id === id ? { ...e, category_id: null } : e,
    )
    state.tasks = state.tasks.map((task) =>
      task.category_id === id ? { ...task, category_id: null } : task,
    )
    save(state)
  },

  listEvents(range: CalendarRange): EventRow[] {
    return load()
      .events.filter((e) => !e.deleted_at && eventOverlapsRange(e, range))
      .sort((a, b) => {
        const as = new Date(a.all_day ? `${a.start_date}T00:00:00` : (a.start_at as string)).getTime()
        const bs = new Date(b.all_day ? `${b.start_date}T00:00:00` : (b.start_at as string)).getTime()
        return as - bs
      })
  },

  createEvent(input: EventInsert): EventRow {
    const state = load()
    const now = new Date().toISOString()
    const row: EventRow = {
      id: uid(),
      user_id: DEMO_USER_ID,
      category_id: input.category_id,
      task_id: input.task_id ?? null,
      title: input.title,
      description: input.description,
      all_day: input.all_day,
      start_at: input.start_at,
      end_at: input.end_at,
      start_date: input.start_date,
      end_date: input.end_date,
      deleted_at: null,
      version: 1,
      created_at: now,
      updated_at: now,
    }
    state.events.push(row)
    save(state)
    return row
  },

  updateEvent(id: string, version: number, patch: EventUpdate & { deleted_at?: string | null }): EventRow {
    const state = load()
    const idx = state.events.findIndex((e) => e.id === id)
    if (idx < 0) throw new ConflictError('该日程已被删除，请刷新')
    const current = state.events[idx]
    if (current.version !== version) throw new ConflictError()
    const row: EventRow = {
      ...current,
      ...patch,
      version: current.version + 1,
      updated_at: new Date().toISOString(),
    }
    state.events[idx] = row
    save(state)
    return row
  },

  softDeleteEvent(id: string, version: number): EventRow {
    const state = load()
    const idx = state.events.findIndex((e) => e.id === id)
    if (idx < 0) throw new ConflictError('该日程已被删除，请刷新')
    const current = state.events[idx]
    if (current.version !== version) throw new ConflictError()
    const row = { ...current, deleted_at: new Date().toISOString(), version: current.version + 1, updated_at: new Date().toISOString() }
    state.events[idx] = row
    save(state)
    return row
  },

  listTasks(): TaskRow[] {
    return sortTasks(load().tasks)
  },

  createTask(input: TaskInsert): TaskRow {
    const state = load()
    const now = new Date().toISOString()
    const row: TaskRow = {
      id: uid(),
      user_id: DEMO_USER_ID,
      title: input.title.trim(),
      notes: input.notes ?? '',
      done: false,
      estimated_minutes: input.estimated_minutes ?? 60,
      category_id: input.category_id ?? null,
      created_at: now,
      updated_at: now,
    }
    state.tasks.push(row)
    save(state)
    return row
  },

  updateTask(id: string, patch: TaskUpdate): TaskRow {
    const state = load()
    const idx = state.tasks.findIndex((task) => task.id === id)
    if (idx < 0) throw new Error('待办不存在')
    const row = { ...state.tasks[idx], ...patch, updated_at: new Date().toISOString() }
    state.tasks[idx] = row
    save(state)
    return row
  },

  deleteTask(id: string): void {
    const state = load()
    state.tasks = state.tasks.filter((task) => task.id !== id)
    save(state)
  },
}
