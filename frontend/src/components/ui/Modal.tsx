import React, { useEffect } from 'react'
import Button from './Button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-fox-purple/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div
        className={[
          'relative w-full bg-white rounded-2xl shadow-fox-lg overflow-hidden',
          'transform transition-all scale-100',
          sizeClasses[size],
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function ModalFooterActions({
  onCancel,
  onConfirm,
  confirmText = 'Сохранить',
  cancelText = 'Отмена',
  loading = false,
  danger = false,
}: {
  onCancel: () => void
  onConfirm: () => void
  confirmText?: string
  cancelText?: string
  loading?: boolean
  danger?: boolean
}) {
  return (
    <>
      <Button variant="ghost" onClick={onCancel}>
        {cancelText}
      </Button>
      <Button
        variant={danger ? 'danger' : 'primary'}
        onClick={onConfirm}
        loading={loading}
      >
        {confirmText}
      </Button>
    </>
  )
}
