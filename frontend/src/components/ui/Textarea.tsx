import type React from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helper?: string
}

export default function Textarea({
  label,
  error,
  helper,
  className = '',
  ...props
}: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold mb-1.5 text-fox-graphite">
          {label}
        </label>
      )}
      <textarea
        className={[
          'w-full rounded-button border px-4 py-3 text-sm transition-all duration-200',
          'bg-white text-fox-graphite placeholder:text-fox-gray-light',
          'focus:outline-none focus:ring-2 focus:border-fox-purple focus:ring-fox-purple/20',
          'hover:border-fox-gray-light/60',
          error ? 'border-fox-error focus:ring-fox-error/20 focus:border-fox-error' : 'border-fox-border',
          className,
        ].join(' ')}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-fox-error font-medium">{error}</p>}
      {!error && helper && <p className="mt-1.5 text-xs text-fox-gray">{helper}</p>}
    </div>
  )
}
