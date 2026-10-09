import { parse } from 'date-fns'
import type { CalendarEvent } from './eventMappers'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { eventPalette } from '../../utils/colors'
import {
  formatFullDate,
  formatShortDate,
  formatTimeOf,
  isSameLocalDay,
  toInclusiveEndDate,
} from '../../utils/dates'

interface EventDetailsProps {
  event: CalendarEvent | null
  onClose: () => void
  onEdit: () => void
}

function rangeText(event: CalendarEvent): string {
  if (event.allDay) {
    const start = event.start as string
    const end = event.end as string
    const inclEnd = toInclusiveEndDate(end)
    const s = parse(start, 'yyyy-MM-dd', new Date())
    if (start === inclEnd) return formatFullDate(s)
    return `${formatShortDate(s)} – ${formatShortDate(parse(inclEnd, 'yyyy-MM-dd', new Date()))}`
  }
  const sIso = event.start as string
  const eIso = event.end as string
  const s = new Date(sIso)
  const e = new Date(eIso)
  if (isSameLocalDay(s, e)) {
    return `${formatFullDate(s)} ${formatTimeOf(sIso)} – ${formatTimeOf(eIso)}`
  }
  return `${formatFullDate(s)} ${formatTimeOf(sIso)} – ${formatFullDate(e)} ${formatTimeOf(eIso)}`
}

export function EventDetails({ event, onClose, onEdit }: EventDetailsProps) {
  if (!event) return null
  const props = event.extendedProps
  const palette = eventPalette(props.categoryColor)

  return (
    <Modal open onClose={onClose} title="日程详情">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {event.title}
        </h3>
        <div className="text-sm text-slate-600 dark:text-slate-300">
          <div className="flex items-start gap-2">
            <span className="mt-0.5">🕐</span>
            <span>{rangeText(event)}</span>
          </div>
          {props.categoryName ? (
            <div className="mt-2 flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: palette.accent }}
              />
              <span>{props.categoryName}</span>
            </div>
          ) : null}
        </div>

        {props.description ? (
          <div className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {props.description}
          </div>
        ) : null}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">
            关闭
          </Button>
          <Button onClick={onEdit} type="button">
            编辑
          </Button>
        </div>
      </div>
    </Modal>
  )
}
