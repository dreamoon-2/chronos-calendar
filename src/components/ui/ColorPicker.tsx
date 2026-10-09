import { eventPalette, THEME_COLORS } from '../../utils/colors'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label: string
  disabled?: boolean
}

export function ColorPicker({ value, onChange, label, disabled }: ColorPickerProps) {
  const palette = eventPalette(value)
  return (
    <div className="space-y-3" role="group" aria-label={label}>
      <div className="flex flex-wrap gap-2">
        {THEME_COLORS.map((theme) => (
          <button
            key={theme.color}
            type="button"
            aria-label={`${label}：${theme.name}`}
            aria-pressed={value.toLowerCase() === theme.color}
            title={`${theme.name} ${theme.color}`}
            disabled={disabled}
            onClick={() => onChange(theme.color)}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-sm text-white shadow-sm outline-offset-2 focus-visible:outline focus-visible:outline-brand-500 disabled:opacity-50 dark:border-slate-800"
            style={{ backgroundColor: theme.color }}
          >
            {value.toLowerCase() === theme.color ? '✓' : ''}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          自定义颜色
          <input
            type="color"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`${label}：自定义颜色`}
            className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5 dark:border-slate-600"
          />
          <span className="font-mono">{value.toUpperCase()}</span>
        </label>
        <span className="rounded-md bg-white">
          <span
            className="block rounded-md border-l-[3px] px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: palette.accent, backgroundColor: palette.background, color: palette.text }}
          >
            日程配色预览
          </span>
        </span>
      </div>
    </div>
  )
}
