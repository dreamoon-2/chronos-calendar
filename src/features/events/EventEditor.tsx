import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import type { CategoryRow, EventRow } from '../../types/database'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { TimeInput } from '../../components/ui/TimeInput'
import { useToast } from '../../components/ui/Toast'
import { ConflictError, toErrorMessage } from '../../utils/errors'
import { useAuth } from '../auth/AuthProvider'
import { ensureNotificationPermission, getEventReminders, setEventReminder } from '../desktop/eventReminders'
import { platform } from '../../platform/detectPlatform'
import { CategoryPicker } from './CategoryPicker'
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
  closeRef?: MutableRefObject<(() => void) | null>
  onChanged: (before: EventRow, after: EventRow, label: string) => void
  onUnschedule?: (event: EventRow) => Promise<void>
  onClose: () => void
}

const FORM_KEYS: (keyof EventFormValues)[] = [
  'title',
  'description',
  'allDay',
  'startDate',
  'startTime',
  'endDate',
  'endTime',
  'categoryId',
  'reminderMinutes',
]

/** 表单是否与基线一致：比 JSON.stringify 更轻，避免每次按键都做序列化。 */
function formsEqual(a: EventFormValues, b: EventFormValues): boolean {
  return FORM_KEYS.every((key) => (a[key] ?? null) === (b[key] ?? null))
}

export function EventEditor({
  mode,
  initial,
  eventId,
  version,
  categories,
  categoriesReady,
  original,
  closeRef,
  onChanged,
  onUnschedule,
  onClose,
}: EventEditorProps) {
  const toast = useToast()
  const createM = useCreateEvent()
  const updateM = useUpdateEvent()
  const deleteM = useSoftDeleteEvent()
  const { user } = useAuth()
  // 只在打开编辑器时读取一次本机提醒设置，编辑过程中不再重复解析 localStorage。
  const [baseline] = useState<EventFormValues>(() => ({
    ...initial,
    reminderMinutes:
      mode === 'edit' && eventId
        ? getEventReminders(user!.id)[eventId] ?? null
        : initial.reminderMinutes ?? null,
  }))
  const [values, setValues] = useState<EventFormValues>(baseline)
  const [moreOpen, setMoreOpen] = useState(() => {
    const form = initial
    return form.description.length > 0 || form.endDate !== form.startDate
  })
  const [confirmClose, setConfirmClose] = useState(false)
  const [errors, setErrors] = useState<EventFormErrors>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [unscheduling, setUnscheduling] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof EventFormValues>(k: K, v: EventFormValues[K]) =>
    setValues((p) => ({
      ...p,
      [k]: v,
      ...(k === 'startDate' && p.endDate === p.startDate ? { endDate: v as string } : {}),
    }))

  const unchanged = useMemo(() => formsEqual(values, baseline), [values, baseline])

  const busy = saving || unscheduling || createM.isPending || updateM.isPending || deleteM.isPending

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

  // 先让抽屉完成首帧绘制，再聚焦标题并弹出输入法：打开编辑器的手感更快。
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      titleRef.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const chooseCategory = useCallback(
    (id: string | null) => setValues((prev) => ({ ...prev, categoryId: id })),
    [],
  )

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

  const onUnscheduleClick = async () => {
    if (!original || !onUnschedule || unscheduling) return
    setUnscheduling(true)
    try {
      await onUnschedule(original)
      onClose()
    } catch {
      // 父级已提示失败原因，保留编辑器。
    } finally {
      setUnscheduling(false)
    }
  }

  return (
    <Modal
      open
      onClose={close}
      closeOnBackdrop={false}
      title={mode === 'create' ? '新建日程' : '编辑日程'}
      footer={
        <div className="flex items-center gap-2">
          <Button onClick={() => void onSave()} disabled={busy} className="min-w-[104px] flex-1" type="button">
            {busy ? '保存中…' : '保存'}
          </Button>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={() => void onDelete()}
              disabled={busy}
              className={
                confirmDelete
                  ? 'chronos-danger-button is-confirming'
                  : 'chronos-danger-button'
              }
            >
              {confirmDelete ? '确认删除？' : '删除'}
            </button>
          )}
        </div>
      }
    >
      <div
        className="chronos-editor"
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault()
            void onSave()
          }
        }}
      >
        {confirmClose && (
          <div className="chronos-alert" role="alert">
            <p>还有未保存的内容，确定要关闭吗？</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" disabled={busy} onClick={onClose}>放弃修改并关闭</Button>
              <Button onClick={() => setConfirmClose(false)}>继续编辑</Button>
            </div>
          </div>
        )}

        <div className="chronos-field">
          <label className="chronos-label" htmlFor="ev-title">
            标题 <span className="text-rose-500">*</span>
          </label>
          <input
            ref={titleRef}
            id="ev-title"
            className="chronos-input"
            value={values.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="例如：小组讨论 · 阅读论文"
            maxLength={120}
            enterKeyHint="done"
          />
          {errors.title && <p className="chronos-field-error">{errors.title}</p>}
        </div>

        <label className="chronos-check">
          <input
            type="checkbox"
            checked={values.allDay}
            onChange={(e) => set('allDay', e.target.checked)}
            className="chronos-checkbox"
          />
          全天事件
        </label>

        {values.allDay ? (
          <div className="chronos-form-grid">
            <div className="chronos-field">
              <label className="chronos-label" htmlFor="ev-sd">开始日期</label>
              <input
                id="ev-sd"
                type="date"
                className="chronos-input"
                value={values.startDate}
                onChange={(e) => set('startDate', e.target.value)}
              />
            </div>
            <div className="chronos-field">
              <label className="chronos-label" htmlFor="ev-ed">结束日期</label>
              <input
                id="ev-ed"
                type="date"
                className="chronos-input"
                value={values.endDate}
                onChange={(e) => set('endDate', e.target.value)}
              />
              {errors.endDate && <p className="chronos-field-error">{errors.endDate}</p>}
            </div>
          </div>
        ) : (
          <>
            <div className="chronos-field">
              <label className="chronos-label" htmlFor="ev-sd">开始日期</label>
              <input
                id="ev-sd"
                type="date"
                className="chronos-input"
                value={values.startDate}
                onChange={(e) => set('startDate', e.target.value)}
              />
            </div>
            <div className="chronos-form-grid">
              <div className="chronos-field">
                <label className="chronos-label" htmlFor="ev-st">开始时间</label>
                <TimeInput
                  id="ev-st"
                  className="chronos-input"
                  value={values.startTime}
                  onChange={(value) => set('startTime', value)}
                />
              </div>
              <div className="chronos-field">
                <label className="chronos-label" htmlFor="ev-et">结束时间</label>
                <TimeInput
                  id="ev-et"
                  className="chronos-input"
                  value={values.endTime}
                  onChange={(value) => set('endTime', value)}
                />
                {errors.endTime && <p className="chronos-field-error">{errors.endTime}</p>}
              </div>
            </div>
          </>
        )}

        <div className="chronos-field">
          <span className="chronos-label">任务类型</span>
          <CategoryPicker
            categories={categories}
            value={values.categoryId}
            onChange={chooseCategory}
            ready={categoriesReady}
            busy={busy}
          />
        </div>

        <div className="chronos-card">
          <label className="chronos-check">
            <input
              type="checkbox"
              aria-label="此日程系统提醒"
              checked={values.reminderMinutes != null}
              onChange={(e) => set('reminderMinutes', e.target.checked ? 10 : null)}
              className="chronos-checkbox"
            />
            提醒此日程
          </label>
          {values.reminderMinutes != null && (
            <label className="mt-2 flex items-center gap-2 text-sm">
              提醒时间
              <select
                aria-label="此日程提前提醒时间"
                className="chronos-input chronos-select"
                value={values.reminderMinutes}
                onChange={(e) => set('reminderMinutes', Number(e.target.value))}
              >
                {[0, 5, 10, 15, 30].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes === 0 ? '开始时' : `提前 ${minutes} 分钟`}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="chronos-field-hint">
            {platform.isTauri ? '仅当前设备提醒；全天日程以 09:00 为基准。' : '提醒设置保存在当前设备，系统通知需使用 Windows 安装版。'}
          </p>
        </div>

        <div className="chronos-card">
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls="ev-more"
            onClick={() => setMoreOpen(!moreOpen)}
            className="chronos-disclosure"
          >
            {moreOpen ? '收起更多选项' : '更多选项 · 跨天与备注'}
            <span aria-hidden="true">{moreOpen ? '−' : '＋'}</span>
          </button>
          <div id="ev-more" hidden={!moreOpen} className="mt-3 space-y-3">
            {!values.allDay && (
              <div className="chronos-field">
                <label className="chronos-label" htmlFor="ev-ed">结束日期（跨天安排）</label>
                <input
                  id="ev-ed"
                  type="date"
                  className="chronos-input"
                  value={values.endDate}
                  onChange={(e) => set('endDate', e.target.value)}
                />
              </div>
            )}
            <div className="chronos-field">
              <label className="chronos-label" htmlFor="ev-desc">备注</label>
              <textarea
                id="ev-desc"
                className="chronos-input resize-none"
                rows={3}
                value={values.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="补充说明（可选）"
                maxLength={10000}
              />
            </div>
          </div>
        </div>

        {mode === 'edit' && original?.task_id && onUnschedule && (
          <div className="chronos-task-link">
            <p>
              此日程由待办「{original.title}」排入时间表。移回待办会删除此日程，并把原待办恢复为未完成。
            </p>
            <Button
              variant="secondary"
              type="button"
              disabled={busy}
              onClick={() => void onUnscheduleClick()}
            >
              {unscheduling ? '移回中…' : '移回待办清单'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
