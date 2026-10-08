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
} from '../types/database'
import { DEFAULT_CATEGORIES } from './categories'
import { ConflictError } from './errors'
import { eventOverlapsRange, toDateOnly } from './dates'

export const DEMO_USER_ID = 'demo-user'
const STORAGE_KEY = 'chronos.demo.v1'

interface DemoState {
  categories: CategoryRow[]
  events: EventRow[]
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function buildSeed(): DemoState {
  const now = new Date()
  const categories: CategoryRow[] = DEFAULT_CATEGORIES.map((c, i) => ({
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
    category_id: categories[4].id,
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

  return { categories, events }
}

function shouldSeed(): boolean {
  return import.meta.env.VITE_DEMO_SEED !== 'false'
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState
      if (Array.isArray(parsed.categories) && Array.isArray(parsed.events)) {
        return parsed
      }
    }
  } catch {
    // 忽略损坏数据，重新播种
  }
  const seeded = shouldSeed() ? buildSeed() : { categories: [], events: [] }
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

  updateEvent(id: string, version: number, patch: EventUpdate): EventRow {
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

  softDeleteEvent(id: string, version: number): void {
    const state = load()
    const idx = state.events.findIndex((e) => e.id === id)
    if (idx < 0) return
    const current = state.events[idx]
    if (current.version !== version) throw new ConflictError()
    state.events[idx] = { ...current, deleted_at: new Date().toISOString(), version: current.version + 1 }
    save(state)
  },
}
