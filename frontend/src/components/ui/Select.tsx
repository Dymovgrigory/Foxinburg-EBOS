import type React from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helper?: string
}

export default function Select({
  label,
  error,
  helper,
  className = '',
  children,
  ...props
}: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold mb-1.5 text-fox-graphite">
          {label}
        </label>
      )}
      <select
        className={[
          'w-full rounded-button border px-4 py-3 text-base md:text-sm transition-all duration-200',
          'bg-white text-fox-graphite',
          'focus:outline-none focus:ring-2 focus:border-fox-purple focus:ring-fox-purple/20',
          'hover:border-fox-gray-light/60',
          error ? 'border-fox-error focus:ring-fox-error/20 focus:border-fox-error' : 'border-fox-border',
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1.5 text-xs text-fox-error font-medium">{error}</p>}
      {!error && helper && <p className="mt-1.5 text-xs text-fox-gray">{helper}</p>}
    </div>
  )
}
