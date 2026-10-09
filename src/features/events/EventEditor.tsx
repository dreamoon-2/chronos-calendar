import { useEffect, useRef, useState } from 'react'
import type { CategoryRow, EventRow } from '../../types/database'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { ConflictError, toErrorMessage } from '../../utils/errors'
import { eventPalette, FALLBACK_COLOR } from '../../utils/colors'
import { DEFAULT_CATEGORIES } from '../categories/categoryPresets'
import { useCreateCategory } from '../categories/categoryQueries'
import { useAuth } from '../auth/AuthProvider'
import { draftKey, readDraft, writeDraft } from './eventDrafts'
import {
  useCreateEvent,
  useSoftDeleteEvent,
  useUpdateEvent,
} from './eventQueries'
import {
  formToEventInsert,
  validateEventForm,
  type EventFormErrors,
  type EventFormValues,
} from './eventSchema'

interface EventEditorProps {
  mode: 'create' | 'edit'
  initial: EventFormValues
  eventId?: string
  version?: number
  categories: CategoryRow[]
  categoriesReady: boolean
  original?: EventRow
  onChanged: (before: EventRow, after: EventRow, label: string) => void
  onClose: () => void
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white'

const labelCls =
  'mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400'

export function EventEditor({
  mode,
  initial,
  eventId,
  version,
  categories,
  categoriesReady,
  original,
  onChanged,
  onClose,
}: EventEditorProps) {
  const toast = useToast()
  const createM = useCreateEvent()
  const updateM = useUpdateEvent()
  const deleteM = useSoftDeleteEvent()
  const createCategoryM = useCreateCategory()
  const { user } = useAuth()
  const key = draftKey(user!.id, eventId)
  const [draft] = useState(() => readDraft(key))
  const finished = useRef(false)

  const [values, setValues] = useState<EventFormValues>(draft?.values ?? initial)
  const [moreOpen, setMoreOpen] = useState(() => {
    const form = draft?.values ?? initial
    return form.description.length > 0 || form.endDate !== form.startDate
  })
  const [draftVersion, setDraftVersion] = useState(draft?.version ?? version)
  const [draftSaved, setDraftSaved] = useState(!!draft)
  const [errors, setErrors] = useState<EventFormErrors>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = <K extends keyof EventFormValues>(k: K, v: EventFormValues[K]) =>
    setValues((p) => ({ ...p, [k]: v, ...(k === 'startDate' && p.endDate === p.startDate ? { endDate: v as string } : {}) }))

  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  const staleDraft = mode === 'edit' && draftVersion !== version
  useEffect(() => {
    if (finished.current) return
    const saved = writeDraft(key, dirty ? { values, version: draftVersion } : null)
    setDraftSaved(dirty && saved)
  }, [key, values, dirty, draftVersion])

  const discardDraft = () => {
    writeDraft(key, null)
    setValues(initial)
    setDraftVersion(version)
    setErrors({})
    setMoreOpen(initial.description.length > 0 || initial.endDate !== initial.startDate)
  }

  const close = () => {
    if (!busy) onClose()
  }

  const busy = createM.isPending || updateM.isPending || deleteM.isPending || createCategoryM.isPending
  const selectedCategory = categories.find((category) => category.id === values.categoryId)
  const palette = eventPalette(selectedCategory?.color ?? FALLBACK_COLOR)

  const chooseType = async (preset: (typeof DEFAULT_CATEGORIES)[number]) => {
    const existing = categories.find((category) => category.name === preset.name)
    if (existing) {
      set('categoryId', existing.id)
      return
    }
    try {
      const category = await createCategoryM.mutateAsync({
        ...preset,
        sort_order: Math.max(-1, ...categories.map((category) => category.sort_order)) + 1,
      })
      set('categoryId', category.id)
    } catch (err) {
      toast.error(toErrorMessage(err))
    }
  }

  const onSave = async () => {
    if (busy || staleDraft) return
    const errs = validateEventForm(values)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    try {
      const payload = formToEventInsert(values)
      if (mode === 'create') {
        await createM.mutateAsync(payload)
        toast.success('已创建日程')
      } else if (eventId && version != null) {
        const saved = await updateM.mutateAsync({ id: eventId, version, patch: payload })
        if (original) onChanged(original, saved, '修改')
        toast.success('已保存修改')
      }
      finished.current = true
      writeDraft(key, null)
      onClose()
    } catch (err) {
      if (err instanceof ConflictError) {
        toast.error('该日程已在其他设备更新，请重新加载')
      } else {
        toast.error(toErrorMessage(err))
      }
    }
  }

  const onDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    if (!eventId || version == null) return
    try {
      const deleted = await deleteM.mutateAsync({ id: eventId, version })
      if (original) onChanged(original, deleted, '删除')
      toast.success('已删除日程')
      finished.current = true
      writeDraft(key, null)
      onClose()
    } catch (err) {
      if (err instanceof ConflictError) {
        toast.error('该日程已在其他设备更新，请重新加载')
      } else {
        toast.error(toErrorMessage(err))
      }
    }
  }

  return (
    <Modal open onClose={close} closeOnBackdrop={false} title={mode === 'create' ? '新建日程' : '编辑日程'}>
      <div className="space-y-4" onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault()
          void onSave()
        }
      }}>
        {(draftSaved || staleDraft) && (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:bg-sky-950 dark:text-sky-200" role="status">
            <span>{staleDraft ? '草稿基于旧版本，请保留需要的内容后丢弃草稿，重新编辑最新日程。' : draft ? '已恢复草稿 · 修改自动保存在本机' : '草稿已自动保存在本机'}</span>
            <button type="button" disabled={busy} onClick={discardDraft} className="shrink-0 underline">丢弃草稿</button>
          </div>
        )}
        {dirty && !draftSaved && !staleDraft && <p role="status" className="text-xs text-amber-700 dark:text-amber-300">本机暂时无法保存草稿，请保持编辑器打开并重试保存。</p>}
        <div>
          <label className={labelCls} htmlFor="ev-title">
            标题 <span className="text-red-500">*</span>
          </label>
          <input
            id="ev-title"
            className={inputCls}
            value={values.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="日程标题"
            maxLength={120}
            autoFocus
          />
          {errors.title && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.title}</p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={values.allDay}
            onChange={(e) => set('allDay', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          全天事件
        </label>

        {values.allDay ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="ev-sd">
                开始日期
              </label>
              <input
                id="ev-sd"
                type="date"
                className={inputCls}
                value={values.startDate}
                onChange={(e) => set('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="ev-ed">
                结束日期
              </label>
              <input
                id="ev-ed"
                type="date"
                className={inputCls}
                value={values.endDate}
                onChange={(e) => set('endDate', e.target.value)}
              />
              {errors.endDate && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.endDate}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="ev-sd">
                开始日期
              </label>
              <input
                id="ev-sd"
                type="date"
                className={inputCls}
                value={values.startDate}
                onChange={(e) => set('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="ev-st">
                开始时间
              </label>
              <input
                id="ev-st"
                type="time"
                className={inputCls}
                value={values.startTime}
                onChange={(e) => set('startTime', e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="ev-et">
                结束时间
              </label>
              <input
                id="ev-et"
                type="time"
                className={inputCls}
                value={values.endTime}
                onChange={(e) => set('endTime', e.target.value)}
              />
              {errors.endTime && (
                <p className="col-span-2 text-xs text-red-600 dark:text-red-400">
                  {errors.endTime}
                </p>
              )}
            </div>
          </div>
        )}

        <div>
          <label className={labelCls} htmlFor="ev-cat">
            任务类型 / 分类
          </label>
          <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label="基础任务类型">
            {DEFAULT_CATEGORIES.map((preset) => {
              const category = categories.find((item) => item.name === preset.name)
              const selected = !!category && values.categoryId === category.id
              return (
                <button key={preset.name} type="button" disabled={busy || !categoriesReady} aria-pressed={selected} onClick={() => void chooseType(preset)} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs disabled:opacity-50 ${selected ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category?.color ?? preset.color }} />
                  {preset.name}
                </button>
              )
            })}
          </div>
          <select
            id="ev-cat"
            className={inputCls}
            value={values.categoryId ?? ''}
            disabled={busy}
            onChange={(e) => set('categoryId', e.target.value || null)}
          >
            <option value="">无分类</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: palette.accent }} />
            {selectedCategory ? `${selectedCategory.name} · 使用该类型主题色` : '未分类 · 使用默认主题色'}
          </div>
          <p className="mt-1 text-xs text-slate-400">在设置中可添加自定义类型、选择主题色或调整颜色。</p>
        </div>

        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <button type="button" aria-expanded={moreOpen} aria-controls="ev-more" onClick={() => setMoreOpen(!moreOpen)} className="text-sm text-slate-500 dark:text-slate-300">{moreOpen ? '−' : '＋'} 更多选项 · 跨天与备注</button>
          <div id="ev-more" hidden={!moreOpen} className="mt-3 space-y-3">
          {!values.allDay && (
            <div>
              <label className={labelCls} htmlFor="ev-ed">结束日期（跨天安排）</label>
              <input id="ev-ed" type="date" className={inputCls} value={values.endDate} onChange={(e) => set('endDate', e.target.value)} />
            </div>
          )}
          <label className={labelCls} htmlFor="ev-desc">
            备注
          </label>
          <textarea
            id="ev-desc"
            className={`${inputCls} resize-none`}
            rows={3}
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="补充说明（可选）"
            maxLength={10000}
          />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button
            onClick={onSave}
            disabled={busy || staleDraft}
            className="flex-1"
            type="button"
          >
            {busy ? '保存中…' : '保存'}
          </Button>
          {mode === 'edit' && (
            <Button
              variant={confirmDelete ? 'danger' : 'secondary'}
              onClick={onDelete}
              disabled={busy}
              type="button"
            >
              {confirmDelete ? '确认删除？' : '删除'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
