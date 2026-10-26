import { beforeEach, describe, expect, it } from 'vitest'
import { demoBackend } from '../../../src/services/demoBackend'
import { ConflictError } from '../../../src/utils/errors'
import type { EventInsert } from '../../../src/types/database'

function timedInsert(title = '测试事件'): EventInsert {
  return {
    title,
    description: '',
    all_day: false,
    category_id: null,
    start_at: new Date(2030, 0, 2, 9, 0).toISOString(),
    end_at: new Date(2030, 0, 2, 10, 0).toISOString(),
    start_date: null,
    end_date: null,
  }
}

const range = { start: new Date(2030, 0, 1), end: new Date(2030, 0, 8) }

describe('demoBackend', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(
      'chronos.demo.v1',
      JSON.stringify({ categories: [], events: [], tasks: [] }),
    )
  })

  it('soft delete removes the event from range queries', () => {
    const created = demoBackend.createEvent(timedInsert())
    expect(demoBackend.listEvents(range).some((e) => e.id === created.id)).toBe(true)

    demoBackend.softDeleteEvent(created.id, created.version)
    expect(demoBackend.listEvents(range).some((e) => e.id === created.id)).toBe(false)
  })

  it('rejects updates with a stale version (conflict)', () => {
    const created = demoBackend.createEvent(timedInsert())
    expect(() => demoBackend.updateEvent(created.id, 999, { title: '覆盖' })).toThrow(
      ConflictError,
    )
  })

  it('increments version on successful update', () => {
    const created = demoBackend.createEvent(timedInsert())
    const updated = demoBackend.updateEvent(created.id, created.version, { title: '新标题' })
    expect(updated.version).toBe(created.version + 1)
    expect(updated.title).toBe('新标题')
  })

  it('creates, completes, lists and deletes tasks', () => {
    const task = demoBackend.createTask({ title: '整理周报' })
    expect(task.done).toBe(false)
    expect(task.estimated_minutes).toBe(60)
    expect(demoBackend.listTasks().map((item) => item.title)).toEqual(['整理周报'])

    const completed = demoBackend.updateTask(task.id, { done: true })
    expect(completed.done).toBe(true)
    expect(demoBackend.listTasks()[0].done).toBe(true)

    demoBackend.deleteTask(task.id)
    expect(demoBackend.listTasks()).toHaveLength(0)
  })

  it('keeps active tasks before completed tasks', () => {
    const first = demoBackend.createTask({ title: '第一条' })
    demoBackend.createTask({ title: '第二条' })
    demoBackend.updateTask(first.id, { done: true })
    expect(demoBackend.listTasks().map((item) => item.title)).toEqual(['第二条', '第一条'])
  })

  it('stores task_id on events created from a task', () => {
    const task = demoBackend.createTask({ title: '写周报' })
    const event = demoBackend.createEvent({ ...timedInsert('写周报'), task_id: task.id })
    expect(event.task_id).toBe(task.id)
    expect(demoBackend.listEvents(range).find((row) => row.id === event.id)?.task_id).toBe(task.id)
  })

  it('reads old demo state without a tasks field', () => {
    localStorage.setItem(
      'chronos.demo.v1',
      JSON.stringify({ categories: [], events: [] }),
    )
    expect(demoBackend.listTasks()).toEqual([])
    expect(demoBackend.createTask({ title: '兼容旧数据' }).title).toBe('兼容旧数据')
  })

  it('creates and lists categories by sort order', () => {
    const later = demoBackend.createCategory({ name: '阅读', color: '#0891b2', sort_order: 2 })
    const first = demoBackend.createCategory({ name: '工作', color: '#4f46e5', sort_order: 1 })
    expect(demoBackend.listCategories().map((category) => category.name)).toEqual([
      first.name,
      later.name,
    ])
  })

  it('clears category references when a category is deleted', () => {
    const category = demoBackend.createCategory({ name: '阅读', color: '#0891b2', sort_order: 0 })
    const event = demoBackend.createEvent({ ...timedInsert('读书'), category_id: category.id })
    const task = demoBackend.createTask({ title: '读书任务', category_id: category.id })
    demoBackend.deleteCategory(category.id)
    expect(demoBackend.listCategories()).toEqual([])
    expect(demoBackend.listEvents(range).find((row) => row.id === event.id)?.category_id).toBeNull()
    expect(demoBackend.listTasks().find((row) => row.id === task.id)?.category_id).toBeNull()
  })
})
