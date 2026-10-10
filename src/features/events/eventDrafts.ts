import type { EventFormValues } from './eventSchema'

export interface EventDraft { id: string; values: EventFormValues; updatedAt: string }
const key = (userId: string) => `chronos.drafts.${userId}`

function validValues(value: unknown): value is EventFormValues {
  if (!value || typeof value !== 'object') return false
  const v = value as EventFormValues
  return typeof v.allDay === 'boolean' &&
    ['title', 'description', 'startDate', 'endDate', 'startTime', 'endTime'].every(field => typeof v[field as keyof EventFormValues] === 'string') &&
    (v.categoryId === null || typeof v.categoryId === 'string') &&
    (v.reminderMinutes == null || [0, 5, 10, 15, 30].includes(v.reminderMinutes))
}

/** 旧版自动草稿只展示在列表中，不自动填入表单。 */
export function listDrafts(userId: string): EventDraft[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key(userId)) ?? '[]')
    const drafts = (Array.isArray(saved) ? saved : []).filter((d): d is EventDraft =>
      d && typeof d.id === 'string' && typeof d.updatedAt === 'string' && validValues(d.values))
    const prefix = `chronos.draft.${userId}.`
    for (let i = 0; i < localStorage.length; i++) {
      const oldKey = localStorage.key(i)!
      if (!oldKey.startsWith(prefix)) continue
      try {
        const old = JSON.parse(localStorage.getItem(oldKey) ?? 'null')
        if (validValues(old?.values)) drafts.push({ id: oldKey, values: old.values, updatedAt: '' })
      } catch { /* 单份损坏的旧草稿不影响其他草稿。 */ }
    }
    return drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } catch { return [] }
}

export function saveDraft(userId: string, values: EventFormValues, id: string = crypto.randomUUID()): EventDraft {
  const oldId = id
  if (id.startsWith(`chronos.draft.${userId}.`)) id = crypto.randomUUID()
  const draft = { id, values: { ...values }, updatedAt: new Date().toISOString() }
  const drafts = listDrafts(userId).filter(d => d.id !== id && !d.id.startsWith('chronos.draft.'))
  localStorage.setItem(key(userId), JSON.stringify([draft, ...drafts]))
  if (oldId.startsWith(`chronos.draft.${userId}.`)) localStorage.removeItem(oldId)
  return draft
}

export function deleteDraft(userId: string, id: string) {
  if (id.startsWith(`chronos.draft.${userId}.`)) { localStorage.removeItem(id); return }
  localStorage.setItem(key(userId), JSON.stringify(listDrafts(userId).filter(d => d.id !== id && !d.id.startsWith('chronos.draft.'))))
}
