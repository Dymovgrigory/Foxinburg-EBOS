import type React from 'react'
import { LuInbox } from 'react-icons/lu'
import Button from './Button'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({
  icon = <LuInbox size={48} />,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-card shadow-fox border"
      style={{ backgroundColor: 'var(--fox-white)', borderColor: 'var(--fox-border)' }}
    >
      <div className="mb-4" style={{ color: 'var(--fox-purple)' }}>
        {icon}
      </div>
      <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--fox-purple)' }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm max-w-md mb-5" style={{ color: 'var(--fox-gray)' }}>
          {description}
        </p>
      )}
      {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
    </div>
  )
}
