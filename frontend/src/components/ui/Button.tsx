import type React from 'react'
import { FiLoader } from 'react-icons/fi'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 hover:scale-[1.02] active:scale-[0.98]'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-fox-gold text-fox-purple hover:bg-fox-gold-light active:bg-fox-gold-dark focus:ring-fox-gold shadow-sm',
  secondary:
    'bg-white text-fox-purple border border-fox-border hover:bg-fox-light active:bg-fox-border focus:ring-fox-purple',
  danger:
    'bg-fox-error text-white hover:bg-red-600 focus:ring-red-300 shadow-sm',
  ghost:
    'bg-transparent text-fox-purple hover:bg-fox-purple/5 active:bg-fox-purple/10 focus:ring-fox-purple',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-button',
  lg: 'px-6 py-3 text-base rounded-button',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      className={[baseClasses, variantClasses[variant], sizeClasses[size], className].join(' ')}
      {...props}
    >
      {loading && <FiLoader className="animate-spin" size={size === 'lg' ? 20 : 16} />}
      {!loading && leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
}
