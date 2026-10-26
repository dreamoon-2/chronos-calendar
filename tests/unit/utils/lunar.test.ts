import { describe, expect, it } from 'vitest'
import { dateSubLabel, lunarDayName, lunarLabel, solarTermName } from '../../../src/utils/lunar'

const at = (iso: string) => new Date(`${iso}T12:00:00+08:00`)

describe('农历标签', () => {
  it('把农历日写成常见的中文写法', () => {
    expect(lunarDayName(1)).toBe('初一')
    expect(lunarDayName(9)).toBe('初九')
    expect(lunarDayName(10)).toBe('初十')
    expect(lunarDayName(11)).toBe('十一')
    expect(lunarDayName(19)).toBe('十九')
    expect(lunarDayName(20)).toBe('二十')
    expect(lunarDayName(21)).toBe('廿一')
    expect(lunarDayName(29)).toBe('廿九')
    expect(lunarDayName(30)).toBe('三十')
  })

  it('读取 2026 年中秋与国庆前后的农历日期', () => {
    // 2026-09-25 为八月十五（中秋），08 月为小月，10-10 为九月初一。
    expect(lunarLabel(at('2026-09-25'))).toBe('十五')
    expect(lunarLabel(at('2026-10-09'))).toBe('廿九')
    expect(lunarLabel(at('2026-10-10'))).toBe('九月')
    expect(lunarLabel(at('2026-10-19'))).toBe('初十')
    expect(lunarLabel(at('2026-10-24'))).toBe('十五')
  })

  it('闰月显示闰月名', () => {
    expect(lunarLabel(at('2023-03-22'))).toBe('闰二月')
  })

  it('识别二十四节气', () => {
    expect(solarTermName(at('2026-10-23'))).toBe('霜降')
    expect(solarTermName(at('2026-02-04'))).toBe('立春')
    expect(solarTermName(at('2026-12-22'))).toBe('冬至')
    expect(solarTermName(at('2026-10-22'))).toBeNull()
  })

  it('副标题优先节气，其次农历', () => {
    expect(dateSubLabel(at('2026-10-23'))).toBe('霜降')
    expect(dateSubLabel(at('2026-10-19'))).toBe('初十')
  })

  it('超出节气支持范围或日期无效时不会抛错', () => {
    expect(solarTermName(at('1899-01-06'))).toBeNull()
    expect(solarTermName(at('2101-01-05'))).toBeNull()
    expect(lunarLabel(new Date(Number.NaN))).toBeNull()
  })
})
