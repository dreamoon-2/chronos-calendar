import { memo, useCallback, useRef, useState } from 'react'
import clsx from 'clsx'
import type { CategoryRow } from '../../types/database'
import { useToast } from '../../components/ui/Toast'
import { THEME_COLORS } from '../../utils/colors'
import { toErrorMessage } from '../../utils/errors'
import { useCreateCategory } from '../categories/categoryQueries'

interface CategoryPickerProps {
  categories: CategoryRow[]
  value: string | null
  onChange: (id: string | null) => void
  ready: boolean
  busy: boolean
}

/**
 * 任务类型选择：直接用彩色标签展示全部类型，替代旧版下拉菜单。
 * 类型不再内置默认值；没有合适类型时可在此直接新建。
 */
export const CategoryPicker = memo(function CategoryPicker({
  categories,
  value,
  onChange,
  ready,
  busy,
}: CategoryPickerProps) {
  const toast = useToast()
  const createM = useCreateCategory()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(() => THEME_COLORS[categories.length % THEME_COLORS.length].color)
  const inputRef = useRef<HTMLInputElement>(null)

  const openCreate = useCallback(() => {
    setColor(THEME_COLORS[categories.length % THEME_COLORS.length].color)
    setCreating(true)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [categories.length])

  const cancelCreate = useCallback(() => {
    setCreating(false)
    setName('')
  }, [])

  const submitCreate = async () => {
    const next = name.trim()
    if (!next || createM.isPending) return
    try {
      const category = await createM.mutateAsync({
        name: next,
        color,
        sort_order: Math.max(-1, ...categories.map((item) => item.sort_order)) + 1,
      })
      onChange(category.id)
      cancelCreate()
      toast.success(`已添加「${next}」类型`)
    } catch (err) {
      toast.error(toErrorMessage(err))
    }
  }

  return (
    <div>
      <div className="chronos-category-chips" role="group" aria-label="任务类型">
        <button
          type="button"
          aria-pressed={value == null}
          disabled={busy}
          onClick={() => onChange(null)}
          className={clsx('chronos-chip', value == null && 'is-selected')}
        >
          <span className="chronos-chip-dot" style={{ borderColor: '#94a3b8' }} />
          未分类
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            aria-pressed={value === category.id}
            disabled={busy}
            onClick={() => onChange(category.id)}
            className={clsx('chronos-chip', value === category.id && 'is-selected')}
          >
            <span className="chronos-chip-dot" style={{ backgroundColor: category.color }} />
            {category.name}
          </button>
        ))}
        {!creating && (
          <button
            type="button"
            disabled={busy || !ready}
            onClick={openCreate}
            className="chronos-chip chronos-chip-new"
          >
            ＋ 新建类型
          </button>
        )}
      </div>

      {creating && (
        <div className="chronos-category-create">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void submitCreate()
                } else if (event.key === 'Escape') {
                  event.stopPropagation()
                  cancelCreate()
                }
              }}
              placeholder="类型名称，回车添加"
              aria-label="新任务类型名称"
              maxLength={40}
              className="chronos-input min-w-0 flex-1"
            />
            <button
              type="button"
              disabled={!name.trim() || createM.isPending}
              onClick={() => void submitCreate()}
              className="chronos-inline-primary"
            >
              {createM.isPending ? '添加中…' : '添加'}
            </button>
            <button type="button" onClick={cancelCreate} className="chronos-inline-ghost">
              取消
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="类型颜色">
            {THEME_COLORS.map((theme) => (
              <button
                key={theme.color}
                type="button"
                aria-label={`类型颜色 ${theme.name}`}
                aria-pressed={color === theme.color}
                title={theme.name}
                onClick={() => setColor(theme.color)}
                className={clsx('chronos-swatch', color === theme.color && 'is-selected')}
                style={{ backgroundColor: theme.color }}
              />
            ))}
          </div>
        </div>
      )}

      <p className="chronos-field-hint">
        类型用于区分日程配色，可在设置中重命名、改色或删除。
      </p>
    </div>
  )
})
