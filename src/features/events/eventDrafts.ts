import type { EventFormValues } from './eventSchema'

export interface EventDraft { values: EventFormValues; version?: number }

export function draftKey(userId: string, eventId?: string) {
  return `chronos.draft.${userId}.${eventId ?? 'new'}`
}

export function readDraft(key: string): EventDraft | null {
  try {
    const draft = JSON.parse(localStorage.getItem(key) ?? 'null') as EventDraft | null
    const values = draft?.values
    if (!values || typeof values.allDay !== 'boolean' ||
      !['title', 'description', 'startDate', 'endDate', 'startTime', 'endTime'].every((field) => typeof values[field as keyof EventFormValues] === 'string') ||
      !(values.categoryId === null || typeof values.categoryId === 'string') ||
      !(draft.version === undefined || (Number.isInteger(draft.version) && draft.version > 0))) return null
    return draft
  } catch { return null }
}

export function writeDraft(key: string, draft: EventDraft | null) {
  try {
    if (draft) localStorage.setItem(key, JSON.stringify(draft))
    else localStorage.removeItem(key)
    return true
  } catch { return false }
}
