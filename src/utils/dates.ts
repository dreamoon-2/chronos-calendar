/**
 * 日期工具。约定：
 * - 分时事件存 UTC 绝对时刻（timestamptz），显示按浏览器本地时区换算。
 * - 全天事件存纯日期范围（DATE），end_date 为 exclusive end。
 * - 严禁用 `toISOString().slice(0,10)` 把本地日期截成全天日期。
 */
import { addDays, format, isSameDay, parse } from 'date-fns'

export const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

/** 本地时区的 Date → 'YYYY-MM-DD'（用于全天日期）。 */
export function toDateOnly(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** 把一个 'YYYY-MM-DD' 字符串加上/减去若干天（本地日历日）。 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const d = parse(dateStr, 'yyyy-MM-dd', new Date())
  return format(addDays(d, days), 'yyyy-MM-dd')
}

/** 本地日期 + 本地时间 → UTC ISO 字符串。`new Date('2026-10-08T09:00:00')` 按本地时间解析。 */
export function combineDateAndTime(dateStr: string, timeStr: string): string {
  const d = new Date(`${dateStr}T${timeStr}:00`)
  return d.toISOString()
}

/** UTC ISO → 本地 { date: 'YYYY-MM-DD', time: 'HH:mm' }（用于编辑表单回填）。 */
export function splitDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  return { date: format(d, 'yyyy-MM-dd'), time: format(d, 'HH:mm') }
}

/** 全天事件：把表单里的“包含式结束日期”转成 exclusive end。 */
export function toExclusiveEndDate(inclusiveEnd: string): string {
  return addDaysToDateString(inclusiveEnd, 1)
}

/** 全天事件：把数据库里的 exclusive end 转成表单里“包含式结束日期”。 */
export function toInclusiveEndDate(exclusiveEnd: string): string {
  return addDaysToDateString(exclusiveEnd, -1)
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return isSameDay(a, b)
}

export function formatTimeOf(iso: string): string {
  return format(new Date(iso), 'HH:mm')
}

export function formatFullDate(d: Date): string {
  return format(d, 'yyyy年M月d日')
}

export function formatShortDate(d: Date): string {
  return format(d, 'M月d日')
}

export function formatYearMonth(d: Date): string {
  return format(d, 'yyyy年M月')
}

/** 判断事件行是否与可视区间 [start, end) 重叠（含跨边界事件）。 */
export function eventOverlapsRange(
  event: {
    all_day: boolean
    start_at: string | null
    end_at: string | null
    start_date: string | null
    end_date: string | null
  },
  range: { start: Date; end: Date },
): boolean {
  if (event.all_day) {
    const ds = event.start_date as string
    const de = event.end_date as string
    const viewStart = toDateOnly(range.start)
    const viewEnd = toDateOnly(range.end)
    // ISO 日期字符串可按字典序比较。
    return ds < viewEnd && de > viewStart
  }
  const s = new Date(event.start_at as string).getTime()
  const e = new Date(event.end_at as string).getTime()
  return s < range.end.getTime() && e > range.start.getTime()
}
