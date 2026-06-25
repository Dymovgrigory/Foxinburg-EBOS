import type React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helper?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  variant?: 'light' | 'dark'
}

export default function Input({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  variant = 'light',
  className = '',
  ...props
}: InputProps) {
  const isDark = variant === 'dark'

  return (
    <div className="w-full">
      {label && (
        <label
          className={`block text-sm font-semibold mb-1.5 ${
            isDark ? 'text-white/80' : 'text-fox-graphite'
          }`}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
              isDark ? 'text-white/50' : 'text-fox-gray-light'
            }`}
          >
            {leftIcon}
          </div>
        )}
        <input
          className={[
            'w-full rounded-button border px-4 py-3 text-base md:text-sm transition-all duration-200',
            'focus:outline-none focus:ring-2',
            isDark
              ? 'bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-fox-gold focus:ring-fox-gold/20'
              : 'bg-white text-fox-graphite placeholder:text-fox-gray-light focus:border-fox-purple focus:ring-fox-purple/20',
            error
              ? 'border-fox-error focus:ring-fox-error/20 focus:border-fox-error'
              : isDark
                ? 'hover:border-white/20'
                : 'hover:border-fox-gray-light/60',
            leftIcon ? 'pl-10' : '',
            rightIcon ? 'pr-10' : '',
            className,
          ].join(' ')}
          {...props}
        />
        {rightIcon && (
          <div
            className={`absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
              isDark ? 'text-white/50' : 'text-fox-gray-light'
            }`}
          >
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-fox-error font-medium">{error}</p>}
      {!error && helper && (
        <p className={`mt-1.5 text-xs ${isDark ? 'text-white/50' : 'text-fox-gray'}`}>
          {helper}
        </p>
      )}
    </div>
  )
}
