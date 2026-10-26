import { useEffect, type ReactNode } from 'react'
import clsx from 'clsx'
import { CloseIcon } from './Icons'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** 固定底部操作区：不随内容滚动。 */
  footer?: ReactNode
  /** 窄屏使用底部抽屉样式。 */
  wide?: boolean
  closeOnBackdrop?: boolean
}

export function Modal({ open, onClose, title, children, footer, wide, closeOnBackdrop = true }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="chronos-modal-backdrop fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={clsx(
          'chronos-modal-panel flex max-h-[92vh] w-full flex-col overflow-hidden',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="chronos-modal-header">
          <h2 className="chronos-modal-title">{title}</h2>
          <button type="button" aria-label="关闭" onClick={onClose} className="chronos-modal-close">
            <CloseIcon width={18} height={18} />
          </button>
        </div>
        <div className="chronos-modal-body min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="chronos-modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
