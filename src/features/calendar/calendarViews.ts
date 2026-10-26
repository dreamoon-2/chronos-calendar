/** 年 → 月 → 周 → 日 → 日程：视图标签、滑动切换与动画方向共用的顺序。 */
export const CALENDAR_VIEWS = [
  { value: 'multiMonthYear', label: '年' },
  { value: 'dayGridMonth', label: '月' },
  { value: 'timeGridWeek', label: '周' },
  { value: 'timeGridDay', label: '日' },
  { value: 'listWeek', label: '日程' },
] as const

export type CalendarViewValue = (typeof CALENDAR_VIEWS)[number]['value']

export const DEFAULT_VIEW: CalendarViewValue = 'timeGridWeek'

export function activeViewIndex(viewType: string): number {
  const index = CALENDAR_VIEWS.findIndex((view) => view.value === viewType)
  return index < 0 ? CALENDAR_VIEWS.findIndex((view) => view.value === DEFAULT_VIEW) : index
}

/** 滑动 / 键盘切换到的相邻视图；已经在首尾时返回 null。 */
export function neighboringView(viewType: string, direction: 1 | -1): CalendarViewValue | null {
  const index = activeViewIndex(viewType) + direction
  return CALENDAR_VIEWS[index]?.value ?? null
}

/** 把 FullCalendar 视图类型映射到界面上的视图标签。 */
export function viewLabel(viewType: string): string {
  return CALENDAR_VIEWS[activeViewIndex(viewType)]?.label ?? ''
}
