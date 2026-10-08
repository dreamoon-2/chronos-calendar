/** 分类默认值与颜色工具。颜色采用“浅底 + 深字 + 左侧色条”。 */

export interface CategoryPreset {
  name: string
  color: string
}

export const DEFAULT_CATEGORIES: CategoryPreset[] = [
  { name: '课程', color: '#d97706' }, // 琥珀
  { name: '科研', color: '#7c3aed' }, // 紫
  { name: '会议', color: '#2563eb' }, // 蓝
  { name: '生活', color: '#0d9488' }, // 青
  { name: '任务', color: '#16a34a' }, // 绿
]

export const FALLBACK_COLOR = '#6a52ec'

const COLOR_PALETTE = [
  '#d97706',
  '#7c3aed',
  '#2563eb',
  '#0d9488',
  '#16a34a',
  '#db2777',
  '#dc2626',
  '#4f46e5',
]

export function colorPalette(): string[] {
  return COLOR_PALETTE
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)))
}

export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return `rgba(106, 82, 236, ${alpha})`
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

/** 深化颜色，用于在浅底上保持可读的深色文字。 */
export function darkenHex(hex: string, factor = 0.45): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#312e81'
  const r = clamp(rgb.r * factor)
  const g = clamp(rgb.g * factor)
  const b = clamp(rgb.b * factor)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

export interface EventPalette {
  accent: string
  background: string
  text: string
}

export function eventPalette(hex: string): EventPalette {
  const accent = hexToRgb(hex) ? hex : FALLBACK_COLOR
  return {
    accent,
    background: hexToRgba(accent, 0.16),
    text: darkenHex(accent, 0.5),
  }
}
