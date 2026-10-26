/**
 * 农历与节气标签：用于周／日视图日期栏的第二行小字。
 *
 * 农历通过浏览器内置的 `Intl` 中国历法读取（Chromium/WebView2/Android WebView 均支持），
 * 不引入额外依赖；若运行环境不支持，则返回 null，界面自动隐藏该行。
 * 节气使用 1900–2100 通用的 24 节气近似公式，误差在 ±1 天内，足够日历展示。
 */

const LUNAR_FORMATTER = (() => {
  try {
    const formatter = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      month: 'long',
      day: 'numeric',
    })
    return formatter
  } catch {
    return null
  }
})()

const DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']

/** 把农历日（1–30）转成「初十／十五／廿三」这类常见写法。 */
export function lunarDayName(day: number): string {
  if (day <= 0 || day > 30) return ''
  if (day === 10) return '初十'
  if (day < 10) return `初${DIGITS[day]}`
  if (day === 20) return '二十'
  if (day < 20) return `十${DIGITS[day - 10]}`
  if (day === 30) return '三十'
  return `廿${DIGITS[day - 20]}`
}

interface LunarParts {
  monthName: string
  day: number
}

function readLunarParts(date: Date): LunarParts | null {
  if (!LUNAR_FORMATTER) return null
  try {
    const parts = LUNAR_FORMATTER.formatToParts(date)
    const monthName = parts.find((part) => part.type === 'month')?.value ?? ''
    const rawDay = parts.find((part) => part.type === 'day')?.value ?? ''
    const day = Number(rawDay)
    // 不支持的运行环境会退回公历：月份名不是「X月」或日期不是 1–30，直接放弃。
    if (!/月$/.test(monthName) || !Number.isInteger(day) || day < 1 || day > 30) return null
    return { monthName, day }
  } catch {
    return null
  }
}

/** 农历月日标签：每月初一显示月名（如「九月」），其余显示日名（如「初十」）。 */
export function lunarLabel(date: Date): string | null {
  const parts = readLunarParts(date)
  if (!parts) return null
  return parts.day === 1 ? parts.monthName : lunarDayName(parts.day)
}

const SOLAR_TERM_NAMES = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑',
  '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
]

/** 每个节气相对基准时刻的分钟偏移，适用于 1900–2100。 */
const SOLAR_TERM_MINUTES = [
  0, 21208, 42467, 63836, 85337, 107014, 128867, 150921,
  173149, 195551, 218072, 240693, 263343, 285989, 308563, 331033,
  353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758,
]

const TERM_BASE_MS = Date.UTC(1900, 0, 6, 2, 5)

/** 指定年份第 index 个节气所在的公历日期（1–31）。 */
function solarTermDay(year: number, index: number): number {
  const ms = 31556925974.7 * (year - 1900) + SOLAR_TERM_MINUTES[index] * 60_000 + TERM_BASE_MS
  return new Date(ms).getUTCDate()
}

/** 当天若是二十四节气之一，返回名称，否则返回 null。 */
export function solarTermName(date: Date): string | null {
  const year = date.getFullYear()
  if (year < 1900 || year > 2100) return null
  const month = date.getMonth()
  const day = date.getDate()
  for (const index of [month * 2, month * 2 + 1]) {
    if (solarTermDay(year, index) === day) return SOLAR_TERM_NAMES[index]
  }
  return null
}

const LABEL_CACHE = new Map<string, string | null>()

/** 日期栏副标题：优先节气（如「霜降」），否则农历日（如「初十」）。 */
export function dateSubLabel(date: Date): string | null {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  if (LABEL_CACHE.has(key)) return LABEL_CACHE.get(key) ?? null
  const label = solarTermName(date) ?? lunarLabel(date)
  if (LABEL_CACHE.size > 800) LABEL_CACHE.clear()
  LABEL_CACHE.set(key, label)
  return label
}
