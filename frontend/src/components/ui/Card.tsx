import type React from 'react'

type Accent = 'none' | 'gold' | 'purple'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  glass?: boolean
  accent?: Accent
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

const accentClasses: Record<Accent, string> = {
  none: '',
  gold: 'border-l-4 border-l-fox-gold',
  purple: 'border-l-4 border-l-fox-purple',
}

export default function Card({
  children,
  padding = 'md',
  hover = false,
  glass = false,
  accent = 'none',
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
        accentClasses[accent],
        hover ? 'hover:shadow-fox-lg hover:-translate-y-0.5' : '',
        paddingClasses[padding],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
