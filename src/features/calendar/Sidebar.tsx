import type { ReactNode } from 'react'
import type { CategoryRow } from '../../types/database'
import { version } from '../../../package.json'
import { CalendarIcon } from '../../components/ui/Icons'
import { MiniCalendar } from './MiniCalendar'

interface SidebarProps {
  currentDate: Date
  categories: CategoryRow[]
  hiddenCategories: Set<string>
  onToggleCategory: (id: string) => void
  onShowAllCategories: () => void
  onGotoDate: (date: Date) => void
  /** 待办面板由日历页注入，避免侧栏依赖具体数据查询。 */
  taskPanel?: ReactNode
}

/** 桌面端侧栏：品牌、迷你月历、待办与分类筛选。 */
export function Sidebar({
  currentDate,
  categories,
  hiddenCategories,
  onToggleCategory,
  onShowAllCategories,
  onGotoDate,
  taskPanel,
}: SidebarProps) {
  const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`
  return (
    <div className="chronos-sidebar-inner">
      <div className="chronos-brand">
        <span className="chronos-brand-icon">
          <CalendarIcon width={18} height={18} />
        </span>
        <span className="chronos-brand-name">Chronos</span>
        <span className="chronos-brand-version">v{version}</span>
      </div>

      <MiniCalendar key={monthKey} currentDate={currentDate} onGotoDate={onGotoDate} />

      {taskPanel}

      <section className="chronos-sidebar-section">
        <div className="chronos-sidebar-heading">
          <h3>分类</h3>
          {hiddenCategories.size > 0 && (
            <button type="button" onClick={onShowAllCategories} className="chronos-text-button">
              全部显示
            </button>
          )}
        </div>

        <ul className="chronos-category-list">
          {categories.map((category) => {
            const hidden = hiddenCategories.has(category.id)
            return (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => onToggleCategory(category.id)}
                  aria-pressed={!hidden}
                  className="chronos-category-button"
                >
                  <span
                    className="chronos-category-dot"
                    style={{
                      backgroundColor: hidden ? 'transparent' : category.color,
                      borderColor: category.color,
                    }}
                  />
                  <span className={hidden ? 'chronos-category-name is-hidden' : 'chronos-category-name'}>
                    {category.name}
                  </span>
                </button>
              </li>
            )
          })}
          {categories.length === 0 && (
            <li className="chronos-sidebar-empty">还没有分类，可在设置或新建日程时添加。</li>
          )}
        </ul>
      </section>
    </div>
  )
}
