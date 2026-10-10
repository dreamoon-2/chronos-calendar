import { useEffect, useState, type MutableRefObject } from 'react'
import type { CategoryRow, EventRow } from '../../types/database'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { ConflictError, toErrorMessage } from '../../utils/errors'
import { eventPalette, FALLBACK_COLOR } from '../../utils/colors'
import { DEFAULT_CATEGORIES } from '../categories/categoryPresets'
import { useCreateCategory } from '../categories/categoryQueries'
import { useAuth } from '../auth/AuthProvider'
import { deleteDraft, saveDraft } from './eventDrafts'
import { ensureNotificationPermission, getEventReminders, setEventReminder } from '../desktop/eventReminders'
import { platform } from '../../platform/detectPlatform'
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
  draftId?: string
  closeRef?: MutableRefObject<(() => void) | null>
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
  draftId: initialDraftId,
  closeRef,
  onChanged,
  onClose,
}: EventEditorProps) {
  const toast = useToast()
  const createM = useCreateEvent()
  const updateM = useUpdateEvent()
  const deleteM = useSoftDeleteEvent()
  const createCategoryM = useCreateCategory()
  const { user } = useAuth()
  const [values, setValues] = useState<EventFormValues>(() => ({ ...initial,
    reminderMinutes: mode === 'edit' && eventId ? getEventReminders(user!.id)[eventId] ?? null : initial.reminderMinutes ?? null,
  }))
  const [moreOpen, setMoreOpen] = useState(() => {
    const form = initial
    return form.description.length > 0 || form.endDate !== form.startDate
  })
  const [draftId, setDraftId] = useState(initialDraftId)
  const [savedValues, setSavedValues] = useState<EventFormValues | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const [errors, setErrors] = useState<EventFormErrors>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof EventFormValues>(k: K, v: EventFormValues[K]) =>
    setValues((p) => ({ ...p, [k]: v, ...(k === 'startDate' && p.endDate === p.startDate ? { endDate: v as string } : {}) }))

  const unchanged = JSON.stringify(values) === JSON.stringify(savedValues ?? { ...initial,
    reminderMinutes: mode === 'edit' && eventId ? getEventReminders(user!.id)[eventId] ?? null : initial.reminderMinutes ?? null,
  })
  const onSaveDraft = (andClose = false) => {
    try {
      const draft = saveDraft(user!.id, values, draftId)
      setDraftId(draft.id)
      setSavedValues({ ...values })
      toast.success('已保存到日程草稿')
      if (andClose) onClose()
    } catch { toast.error('草稿保存失败，请保留表单并重试') }
  }
  const close = () => {
    if (busy) return
    if (unchanged) onClose()
    else setConfirmClose(true)
  }

  useEffect(() => {
    if (!closeRef) return
    closeRef.current = close
    return () => { closeRef.current = null }
  })

  const busy = saving || createM.isPending || updateM.isPending || deleteM.isPending || createCategoryM.isPending
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
    if (busy) return
    const errs = validateEventForm(values)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    try {
      const payload = formToEventInsert(values)
      if (values.reminderMinutes != null) await ensureNotificationPermission()
      let saved: EventRow
      if (mode === 'create') {
        saved = await createM.mutateAsync(payload)
        toast.success('已创建日程')
      } else if (eventId && version != null) {
        saved = await updateM.mutateAsync({ id: eventId, version, patch: payload })
        if (original) onChanged(original, saved, '修改')
        toast.success('已保存修改')
      } else return
      // 云端保存成功后，本机存储失败也不能让重试创建出重复日程。
      try { setEventReminder(user!.id, saved.id, values.reminderMinutes ?? null) }
      catch { toast.error('日程已保存，但本机提醒设置保存失败，请重新编辑提醒') }
      if (draftId) {
        try { deleteDraft(user!.id, draftId) }
        catch { toast.error('日程已保存，原草稿清理失败，可在草稿列表中删除') }
      }
      onClose()
    } catch (err) {
      if (err instanceof ConflictError) {
        toast.error('该日程已在其他设备更新，请重新加载')
      } else {
        toast.error(toErrorMessage(err))
      }
    } finally { setSaving(false) }
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
        {confirmClose && <div className="space-y-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100" role="alert">
          <p>还有未保存的内容，要保存为草稿吗？</p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => onSaveDraft(true)}>保存草稿并关闭</Button>
            <Button variant="secondary" disabled={busy} onClick={onClose}>不保存并关闭</Button>
            <Button variant="secondary" onClick={() => setConfirmClose(false)}>继续编辑</Button>
          </div>
        </div>}
        {savedValues && unchanged && <p role="status" className="text-xs text-sky-700 dark:text-sky-300">已保存到日程草稿，可从功能栏再次打开。</p>}
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

        <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" aria-label="此日程系统提醒" checked={values.reminderMinutes != null} onChange={e => set('reminderMinutes', e.target.checked ? 10 : null)} />
            提醒此日程
          </label>
          {values.reminderMinutes != null && <label className="flex items-center gap-2 text-sm">提醒时间
            <select aria-label="此日程提前提醒时间" className={inputCls} value={values.reminderMinutes} onChange={e => set('reminderMinutes', Number(e.target.value))}>
              {[0, 5, 10, 15, 30].map(minutes => <option key={minutes} value={minutes}>{minutes === 0 ? '开始时' : `提前 ${minutes} 分钟`}</option>)}
            </select>
          </label>}
          <p className="text-xs text-slate-400">{platform.isTauri ? '仅当前设备提醒；全天日程以 09:00 为基准。' : '提醒设置保存在当前设备，系统通知需使用 Windows 安装版。'}</p>
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
            disabled={busy}
            className="flex-1"
            type="button"
          >
            {busy ? '保存中…' : '保存'}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => onSaveDraft()}>保存草稿</Button>
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
