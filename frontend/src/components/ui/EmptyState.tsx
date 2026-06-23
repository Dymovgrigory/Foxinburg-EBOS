import type React from 'react'
import { LuInbox } from 'react-icons/lu'
import Button from './Button'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  mascot?: boolean
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  mascot = true,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-card shadow-fox border relative overflow-hidden"
      style={{ backgroundColor: 'var(--fox-white)', borderColor: 'var(--fox-border)' }}
    >
      {mascot && (
        <img
          src="/brand/mascot-hero.png"
          alt=""
          className="absolute -right-6 -bottom-8 w-32 h-44 object-contain opacity-10 pointer-events-none select-none"
        />
      )}
      <div
        className="relative z-10 mb-4 w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: 'var(--fox-gold)', color: 'var(--fox-purple)' }}
      >
        {icon || <LuInbox size={32} />}
      </div>
      <h3 className="relative z-10 text-lg font-bold mb-2" style={{ color: 'var(--fox-purple)' }}>
        {title}
      </h3>
      {description && (
        <p className="relative z-10 text-sm max-w-md mb-5" style={{ color: 'var(--fox-gray)' }}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <div className="relative z-10">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      )}
    </div>
  )
}
