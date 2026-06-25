import React, { useEffect } from 'react'
import { LuX } from 'react-icons/lu'

interface SheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  position?: 'left' | 'right' | 'bottom'
  className?: string
}

export default function Sheet({
  isOpen,
  onClose,
  title,
  children,
  position = 'bottom',
  className = '',
}: SheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const positionClasses = {
    left: 'inset-y-0 left-0 w-80 max-w-[85vw] rounded-r-2xl',
    right: 'inset-y-0 right-0 w-80 max-w-[85vw] rounded-l-2xl',
    bottom: 'left-0 right-0 bottom-0 max-h-[85vh] rounded-t-2xl',
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-fox-purple/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div
        className={[
          'absolute bg-white shadow-fox-lg flex flex-col',
          positionClasses[position],
          className,
        ].join(' ')}
        style={{ backgroundColor: 'var(--fox-white)' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-fox-border">
          {title ? <h3 className="text-base font-bold text-fox-purple truncate">{title}</h3> : <span />}
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-fox-gray/70 hover:text-fox-gray hover:bg-fox-light transition"
            aria-label="Закрыть"
          >
            <LuX size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}
