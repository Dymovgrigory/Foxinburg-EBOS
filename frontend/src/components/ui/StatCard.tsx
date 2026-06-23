import type React from 'react'
import { Link } from 'react-router-dom'
import Card from './Card'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  variant?: 'purple' | 'gold' | 'graphite' | 'outline'
  href?: string
  subtitle?: string
}

const variantClasses = {
  purple: 'bg-fox-purple text-white',
  gold: 'bg-fox-gold text-fox-purple',
  graphite: 'bg-fox-graphite text-white',
  outline: 'bg-fox-light text-fox-purple border border-fox-border',
}

export default function StatCard({
  title,
  value,
  icon,
  variant = 'purple',
  href,
  subtitle,
}: StatCardProps) {
  const content = (
    <Card className="flex items-center gap-4 h-full" hover={!!href}>
      <div
        className={[
          'w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0',
          variantClasses[variant],
        ].join(' ')}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-fox-dark">{value}</div>
        <div className="text-xs text-fox-gray font-medium">{title}</div>
        {subtitle && <div className="text-[10px] text-fox-gray/70 mt-0.5">{subtitle}</div>}
      </div>
    </Card>
  )

  if (href) {
    return (
      <Link to={href} className="block">
        {content}
      </Link>
    )
  }

  return content
}
