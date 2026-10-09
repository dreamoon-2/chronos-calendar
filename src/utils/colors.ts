/** 通用主题色与配色工具。颜色采用“浅底 + 深字 + 左侧色条”。 */

export const FALLBACK_COLOR = '#6a52ec'

export const THEME_COLORS = [
  { name: '琥珀', color: '#d97706' },
  { name: '紫罗兰', color: '#7c3aed' },
  { name: '天空蓝', color: '#2563eb' },
  { name: '青绿', color: '#0d9488' },
  { name: '草绿', color: '#16a34a' },
  { name: '玫瑰', color: '#db2777' },
  { name: '珊瑚红', color: '#dc2626' },
  { name: '靛蓝', color: '#4f46e5' },
  { name: '石板灰', color: '#64748b' },
  { name: '天青', color: '#0891b2' },
]

export function colorPalette(): string[] {
  return THEME_COLORS.map((theme) => theme.color)
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
