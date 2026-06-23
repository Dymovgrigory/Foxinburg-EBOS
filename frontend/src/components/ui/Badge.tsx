import type React from 'react'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'
export type BadgeSize = 'sm' | 'md'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-fox-light text-fox-graphite',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-fox-warning/10 text-fox-warning',
  error: 'bg-fox-error/10 text-fox-error',
  info: 'bg-fox-purple/10 text-fox-purple',
  purple: 'bg-fox-purple/10 text-fox-purple',
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 font-semibold rounded-full',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...props}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
