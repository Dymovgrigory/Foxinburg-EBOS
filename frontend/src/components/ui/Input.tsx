import type React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helper?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export default function Input({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-fox-graphite mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fox-gray-light pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          className={[
            'w-full rounded-button border bg-white px-4 py-3 text-sm text-fox-graphite',
            'placeholder:text-fox-gray-light',
            'focus:outline-none focus:ring-2 focus:ring-fox-purple/20 focus:border-fox-purple',
            'transition-all duration-200',
            error
              ? 'border-fox-error focus:ring-fox-error/20 focus:border-fox-error'
              : 'border-fox-border hover:border-fox-gray-light/60',
            leftIcon ? 'pl-10' : '',
            rightIcon ? 'pr-10' : '',
            className,
          ].join(' ')}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fox-gray-light pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-fox-error font-medium">{error}</p>}
      {!error && helper && <p className="mt-1.5 text-xs text-fox-gray">{helper}</p>}
    </div>
  )
}
