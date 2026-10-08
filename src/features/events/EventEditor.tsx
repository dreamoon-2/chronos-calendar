import { useState } from 'react'
import type { CategoryRow } from '../../types/database'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { ConflictError, toErrorMessage } from '../../lib/errors'
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
  onClose,
}: EventEditorProps) {
  const toast = useToast()
  const createM = useCreateEvent()
  const updateM = useUpdateEvent()
  const deleteM = useSoftDeleteEvent()

  const [values, setValues] = useState<EventFormValues>(initial)
  const [errors, setErrors] = useState<EventFormErrors>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = <K extends keyof EventFormValues>(k: K, v: EventFormValues[K]) =>
    setValues((p) => ({ ...p, [k]: v }))

  const busy = createM.isPending || updateM.isPending || deleteM.isPending

  const onSave = async () => {
    const errs = validateEventForm(values)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    try {
      const payload = formToEventInsert(values)
      if (mode === 'create') {
        await createM.mutateAsync(payload)
        toast.success('已创建日程')
      } else if (eventId && version != null) {
        await updateM.mutateAsync({ id: eventId, version, patch: payload })
        toast.success('已保存修改')
      }
      onClose()
    } catch (err) {
      if (err instanceof ConflictError) {
        toast.error('该日程已在其他设备更新，请重新加载')
      } else {
        toast.error(toErrorMessage(err))
      }
      onClose()
    }
  }

  const onDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    if (!eventId || version == null) return
    try {
      await deleteM.mutateAsync({ id: eventId, version })
      toast.success('已删除日程')
    } catch (err) {
      if (err instanceof ConflictError) {
        toast.error('该日程已在其他设备更新，请重新加载')
      } else {
        toast.error(toErrorMessage(err))
      }
    }
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={mode === 'create' ? '新建日程' : '编辑日程'}>
      <div className="space-y-4">
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
            分类
          </label>
          <select
            id="ev-cat"
            className={inputCls}
            value={values.categoryId ?? ''}
            onChange={(e) => set('categoryId', e.target.value || null)}
          >
            <option value="">无分类</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
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

        <div className="flex items-center gap-3 pt-1">
          <Button
            onClick={onSave}
            disabled={busy}
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
