import { useEffect, useRef, useState, type ChangeEvent, type FocusEvent, type KeyboardEvent } from 'react'

interface TimeInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

function normalizeTime(raw: string, allowHourOnly: boolean): string | null {
  const value = raw.trim().replaceAll('：', ':')
  const colon = /^(\d{1,2}):(\d{1,2})$/.exec(value)
  if (colon) {
    const hour = Number(colon[1])
    const minute = Number(colon[2])
    if (hour <= 23 && minute <= 59) {
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    }
    return null
  }
  if (!allowHourOnly) return null
  const digits = value.replace(/\D/g, '')
  if (digits.length === 1 || digits.length === 2) {
    const hour = Number(digits)
    return hour <= 23 ? `${String(hour).padStart(2, '0')}:00` : null
  }
  if (digits.length === 3 || digits.length === 4) {
    const hour = Number(digits.slice(0, digits.length - 2))
    const minute = Number(digits.slice(-2))
    if (hour <= 23 && minute <= 59) {
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    }
  }
  return null
}

/**
 * 纯数字时间输入。移动端原生 type="time" 会弹出时钟表盘，
 * 这里统一桌面／手机为「输入 HH:mm 或 4 位数字」的文本框。
 */
export function TimeInput({
  id,
  value,
  onChange,
  disabled,
  className,
  'aria-label': ariaLabel,
}: TimeInputProps) {
  const [text, setText] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // 外部（例如表单重置或回填）改变值时同步显示；正在输入时不打断光标。
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setText(value)
  }, [value])

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value.replace(/[^\d:：]/g, '').slice(0, 5)
    setText(next)
    const normalized = normalizeTime(next, false) ??
      (/^\d{4}$/.test(next) ? normalizeTime(next, true) : null)
    if (normalized) onChange(normalized)
  }

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const normalized = normalizeTime(event.target.value, true)
    if (normalized) {
      setText(normalized)
      if (normalized !== value) onChange(normalized)
    } else {
      setText(value)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
    }
  }

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      maxLength={5}
      placeholder="HH:mm"
      aria-label={ariaLabel}
      disabled={disabled}
      className={className}
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onFocus={(event) => event.currentTarget.select()}
    />
  )
}
