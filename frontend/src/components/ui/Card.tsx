import type React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  glass?: boolean
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

export default function Card({
  children,
  padding = 'md',
  hover = false,
  glass = false,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={[
        'rounded-card shadow-fox border transition-all duration-200',
        glass
          ? 'bg-white/80 border-white/20 backdrop-blur'
          : 'bg-white border-fox-border/50',
        hover ? 'hover:shadow-fox-lg hover:scale-[1.01]' : '',
        paddingClasses[padding],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
